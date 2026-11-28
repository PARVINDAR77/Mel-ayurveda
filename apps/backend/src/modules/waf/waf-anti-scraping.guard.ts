import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { WAF_CONFIG } from './waf.constants';

@Injectable()
export class WafAntiScrapingGuard implements CanActivate {
  private readonly logger = new Logger(WafAntiScrapingGuard.name);

  // In-memory sliding window: Key (userId or IP) -> { count, windowStart }
  private readonly accessHistory = new Map<string, { count: number; windowStart: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user;
    const ip =
      (req.headers['cf-connecting-ip'] as string) ||
      ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const trackKey = user?.id ? `USER:${user.id}` : `IP:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    let record = this.accessHistory.get(trackKey);
    if (!record || now - record.windowStart > windowMs) {
      record = { count: 1, windowStart: now };
      this.accessHistory.set(trackKey, record);
      return true;
    }

    record.count += 1;

    if (record.count > WAF_CONFIG.MAX_LEAD_REQUESTS_PER_MIN) {
      this.logger.warn(
        `🚨 Melayurveda WAF Anti-Scraper triggered for [${trackKey}]: Exceeded ${WAF_CONFIG.MAX_LEAD_REQUESTS_PER_MIN} lead requests/min on ${req.method} ${req.url}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate Limit Exceeded',
          message:
            'Melayurveda WAF Anti-Scraping Shield: High-frequency data access detected. Please wait a moment before querying more patient leads.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
