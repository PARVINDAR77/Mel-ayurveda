/**
 * Melayurveda Web Application Firewall (WAF) Security Constants
 * Defines attack signatures, malicious bots, and defense thresholds.
 */

export const WAF_CONFIG = {
  // Max failed logins per IP within the window before temporary lockout
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  FAILED_LOGIN_WINDOW_MS: 2 * 60 * 1000, // 2 minutes
  IP_BAN_DURATION_MS: 15 * 60 * 1000,    // 15 minutes ban

  // Lead Anti-Scraping / DLP limit per user account or IP
  MAX_LEAD_REQUESTS_PER_MIN: 60,

  // Custom Security Headers
  WAF_HEADER_NAME: 'X-Melayurveda-WAF',
  WAF_HEADER_VALUE: 'Active-Enterprise-v1.0',
};

/**
 * Signatures of automated scrapers, vulnerability scanners, and non-browser CLI bots
 */
export const KNOWN_BAD_BOT_PATTERNS: RegExp[] = [
  /python-requests/i,
  /aiohttp/i,
  /urllib/i,
  /scrapy/i,
  /curl\/\d/i,
  /wget\/\d/i,
  /go-http-client/i,
  /libwww-perl/i,
  /apache-httpclient/i,
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /zgrab/i,
  /dirbuster/i,
  /acunetix/i,
  /netsparker/i,
];

/**
 * Known legitimate browser or system patterns that should NEVER be blocked as bots
 */
export const BROWSER_WHITELIST_PATTERNS: RegExp[] = [
  /Mozilla/i,
  /Chrome/i,
  /Safari/i,
  /Firefox/i,
  /Edge/i,
  /Opera/i,
  /Dalvik/i,
  /iPhone/i,
  /Android/i,
  /Next\.js/i,
  /Melayurveda/i,
];

/**
 * SQL Injection (SQLi) attack signatures
 */
export const SQL_INJECTION_PATTERNS: RegExp[] = [
  /\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT|SELECT\s+.*\s+FROM|INSERT\s+INTO|DROP\s+TABLE|ALTER\s+TABLE|DELETE\s+FROM|EXEC\s*\(|SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\(|pg_sleep)\b/i,
  /('|\%27)\s*OR\s*('|\%27)?\d+('|\%27)?\s*=\s*('|\%27)?\d+/i,
  /('|\%27)\s*OR\s*('|\%27)?[a-zA-Z]+('|\%27)?\s*=\s*('|\%27)?[a-zA-Z]+/i,
  /(--\s*$|#\s*$|\/\*.*\*\/)/,
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)\b/i,
];

/**
 * Cross-Site Scripting (XSS) attack signatures
 */
export const XSS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /<script[\s>]/i,
  /javascript:\s*/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
];

/**
 * Path & Directory Traversal signatures
 */
export const DIRECTORY_TRAVERSAL_PATTERNS: RegExp[] = [
  /(\.\.[/\\])+/,
  /%2e%2e[%2f%5c]/i,
  /\x00/, // Null-byte poison
];
