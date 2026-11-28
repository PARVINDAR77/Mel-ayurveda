import { Injectable, Logger, Optional } from '@nestjs/common';
import { Request } from 'express';
import {
  WAF_CONFIG,
  KNOWN_BAD_BOT_PATTERNS,
  BROWSER_WHITELIST_PATTERNS,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  DIRECTORY_TRAVERSAL_PATTERNS,
} from './waf.constants';
import { AuditService } from '../audit/audit.service';

export interface BannedIpRecord {
  ip: string;
  bannedAt: Date;
  expiresAt: Date;
  reason: string;
}

export interface WafMetrics {
  totalInspected: number;
  totalBotsBlocked: number;
  totalSqliBlocked: number;
  totalXssBlocked: number;
  totalTraversalBlocked: number;
  totalBruteForceBanned: number;
  activeBannedIpsCount: number;
  activeBannedIps: BannedIpRecord[];
  whitelistedIps: string[];
  blacklistedIps: string[];
}

@Injectable()
export class WafService {
  private readonly logger = new Logger('MelayurvedaWAF');

  // In-memory sliding window for failed auth attempts: IP -> { count, firstAttempt }
  private readonly failedLogins = new Map<string, { count: number; firstAttemptTime: number }>();

  // In-memory banned IPs: IP -> BannedIpRecord
  private readonly bannedIps = new Map<string, BannedIpRecord>();

  // Permanent blacklist & whitelist
  private readonly ipBlacklist = new Set<string>();
  private readonly ipWhitelist = new Set<string>(['127.0.0.1', '::1', 'localhost']);

  // Counters
  private metrics = {
    totalInspected: 0,
    totalBotsBlocked: 0,
    totalSqliBlocked: 0,
    totalXssBlocked: 0,
    totalTraversalBlocked: 0,
    totalBruteForceBanned: 0,
  };

  constructor(@Optional() private readonly auditService?: AuditService) {}

  /**
   * Resolves genuine client IP across proxies, Cloudflare, and local networking
   */
  getClientIp(req: Request): string {
    const cfIp = req.headers['cf-connecting-ip'] as string;
    if (cfIp) return cfIp.trim();

    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      const parts = forwarded.split(',');
      if (parts.length > 0 && parts[0].trim()) {
        return parts[0].trim().replace(/^::ffff:/, '');
      }
    }

    const remote = req.socket?.remoteAddress || '127.0.0.1';
    return remote.replace(/^::ffff:/, '');
  }

  /**
   * Checks if an IP is currently banned or blacklisted
   */
  isIpBanned(ip: string): { isBanned: boolean; remainingSeconds?: number; reason?: string } {
    if (this.ipWhitelist.has(ip)) {
      return { isBanned: false };
    }

    if (this.ipBlacklist.has(ip)) {
      return { isBanned: true, reason: 'Permanently Blacklisted by Administrator' };
    }

    const ban = this.bannedIps.get(ip);
    if (!ban) return { isBanned: false };

    const now = Date.now();
    if (ban.expiresAt.getTime() <= now) {
      this.bannedIps.delete(ip);
      return { isBanned: false };
    }

    const remainingSeconds = Math.max(1, Math.ceil((ban.expiresAt.getTime() - now) / 1000));
    return {
      isBanned: true,
      remainingSeconds,
      reason: ban.reason,
    };
  }

  /**
   * Records a failed authentication attempt. When threshold is met, bans the IP.
   */
  recordFailedAuth(ip: string, reason: string = 'Invalid credentials'): { isBanned: boolean; remainingAttempts: number } {
    if (this.ipWhitelist.has(ip)) {
      return { isBanned: false, remainingAttempts: WAF_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS };
    }

    const now = Date.now();
    let record = this.failedLogins.get(ip);

    if (!record || now - record.firstAttemptTime > WAF_CONFIG.FAILED_LOGIN_WINDOW_MS) {
      record = { count: 1, firstAttemptTime: now };
      this.failedLogins.set(ip, record);
      return { isBanned: false, remainingAttempts: WAF_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS - 1 };
    }

    record.count += 1;

    if (record.count >= WAF_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS) {
      const expiresAt = new Date(now + WAF_CONFIG.IP_BAN_DURATION_MS);
      this.bannedIps.set(ip, {
        ip,
        bannedAt: new Date(now),
        expiresAt,
        reason: `Exceeded ${WAF_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts (${reason})`,
      });

      this.failedLogins.delete(ip);
      this.metrics.totalBruteForceBanned += 1;

      this.logger.warn(`🚨 Melayurveda WAF: IP [${ip}] BANNED for 15 minutes due to brute-force auth attempts.`);

      if (this.auditService) {
        this.auditService
          .logAction({
            action: 'WAF_IP_BANNED',
            entityType: 'SECURITY_FIREWALL',
            entityId: ip,
            newState: { ip, reason, banMinutes: 15, expiresAt },
            ipAddress: ip,
          })
          .catch((err) => this.logger.error(`Failed to record WAF audit: ${err.message}`));
      }

      return { isBanned: true, remainingAttempts: 0 };
    }

    const remaining = Math.max(0, WAF_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS - record.count);
    return { isBanned: false, remainingAttempts: remaining };
  }

  /**
   * Resets failed login counters upon successful authentication
   */
  recordSuccessfulAuth(ip: string): void {
    this.failedLogins.delete(ip);
  }

  /**
   * Deeply inspects an incoming request against all attack signatures
   */
  inspectRequest(req: Request): { allowed: boolean; reason?: string; category?: string } {
    this.metrics.totalInspected += 1;
    const ip = this.getClientIp(req);

    // Whitelist bypass
    if (this.ipWhitelist.has(ip)) {
      return { allowed: true };
    }

    // 1. IP Ban check
    const banCheck = this.isIpBanned(ip);
    if (banCheck.isBanned) {
      return {
        allowed: false,
        category: 'IP_BANNED',
        reason: `Your IP [${ip}] is temporarily banned: ${banCheck.reason}. Retry in ${banCheck.remainingSeconds || 0}s.`,
      };
    }

    const userAgent = (req.headers['user-agent'] as string) || '';

    // 2. Automated Bot / CLI Scraper check
    // If it's a known browser, skip bot test
    const isLegitBrowser = BROWSER_WHITELIST_PATTERNS.some((p) => p.test(userAgent));
    if (!isLegitBrowser && userAgent) {
      const isBadBot = KNOWN_BAD_BOT_PATTERNS.some((p) => p.test(userAgent));
      if (isBadBot) {
        this.metrics.totalBotsBlocked += 1;
        this.logger.warn(`🛡️ Melayurveda WAF: Blocked automated bot [${userAgent}] from IP [${ip}] on ${req.method} ${req.url}`);
        return {
          allowed: false,
          category: 'BOT',
          reason: 'Automated crawler or unauthorized script client blocked by Melayurveda WAF.',
        };
      }
    }

    // 3. Payload inspection (query, body, params)
    const payloadStrings: string[] = [];

    // Query values
    if (req.query && typeof req.query === 'object') {
      this.extractStrings(req.query, payloadStrings);
    }

    // Body values
    if (req.body && typeof req.body === 'object') {
      this.extractStrings(req.body, payloadStrings);
    }

    // URL path
    payloadStrings.push(decodeURIComponent(req.originalUrl || req.url || ''));

    for (const val of payloadStrings) {
      // Check SQLi
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(val)) {
          this.metrics.totalSqliBlocked += 1;
          this.logger.warn(`🛡️ Melayurveda WAF: SQLi signature matched from IP [${ip}] on ${req.method} ${req.url}`);
          return {
            allowed: false,
            category: 'SQLI',
            reason: 'Malicious SQL injection pattern detected and blocked by Melayurveda WAF.',
          };
        }
      }

      // Check XSS
      for (const pattern of XSS_PATTERNS) {
        if (pattern.test(val)) {
          this.metrics.totalXssBlocked += 1;
          this.logger.warn(`🛡️ Melayurveda WAF: XSS signature matched from IP [${ip}] on ${req.method} ${req.url}`);
          return {
            allowed: false,
            category: 'XSS',
            reason: 'Malicious script injection (XSS) detected and blocked by Melayurveda WAF.',
          };
        }
      }

      // Check Directory Traversal
      for (const pattern of DIRECTORY_TRAVERSAL_PATTERNS) {
        if (pattern.test(val)) {
          this.metrics.totalTraversalBlocked += 1;
          this.logger.warn(`🛡️ Melayurveda WAF: Directory traversal matched from IP [${ip}] on ${req.method} ${req.url}`);
          return {
            allowed: false,
            category: 'TRAVERSAL',
            reason: 'Directory traversal pattern detected and blocked by Melayurveda WAF.',
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Helper to recursively extract all string fields from an object for deep inspection
   */
  private extractStrings(obj: any, results: string[], depth = 0): void {
    if (!obj || depth > 5) return;
    if (typeof obj === 'string') {
      results.push(obj);
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractStrings(item, results, depth + 1);
      }
      return;
    }
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        results.push(key);
        this.extractStrings(obj[key], results, depth + 1);
      }
    }
  }

  /**
   * Manually unbans an IP address
   */
  unbanIp(ip: string): boolean {
    const existed = this.bannedIps.delete(ip);
    this.failedLogins.delete(ip);
    return existed;
  }

  /**
   * Adds an IP to the permanent blacklist
   */
  blacklistIp(ip: string, reason = 'Manually blacklisted'): void {
    this.ipBlacklist.add(ip);
    this.bannedIps.set(ip, {
      ip,
      bannedAt: new Date(),
      expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      reason,
    });
  }

  /**
   * Adds an IP to the trusted whitelist
   */
  whitelistIp(ip: string): void {
    this.ipWhitelist.add(ip);
    this.bannedIps.delete(ip);
    this.ipBlacklist.delete(ip);
  }

  /**
   * Returns live WAF metrics
   */
  getMetrics(): WafMetrics {
    const activeBanned: BannedIpRecord[] = [];
    const now = Date.now();
    for (const [ip, record] of this.bannedIps.entries()) {
      if (record.expiresAt.getTime() > now) {
        activeBanned.push(record);
      }
    }

    return {
      ...this.metrics,
      activeBannedIpsCount: activeBanned.length,
      activeBannedIps: activeBanned,
      whitelistedIps: Array.from(this.ipWhitelist),
      blacklistedIps: Array.from(this.ipBlacklist),
    };
  }
}
