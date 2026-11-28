import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WafService } from './waf.service';
import { WAF_CONFIG } from './waf.constants';

@Injectable()
export class WafMiddleware implements NestMiddleware {
  constructor(private readonly wafService: WafService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Stamp the response with Melayurveda Enterprise WAF Header
    res.setHeader(WAF_CONFIG.WAF_HEADER_NAME, WAF_CONFIG.WAF_HEADER_VALUE);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Run deep inspection on the incoming request
    const result = this.wafService.inspectRequest(req);

    if (!result.allowed) {
      if (result.category === 'IP_BANNED') {
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: result.reason,
          category: result.category,
          waf: WAF_CONFIG.WAF_HEADER_VALUE,
        });
      }

      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: result.reason,
        category: result.category,
        waf: WAF_CONFIG.WAF_HEADER_VALUE,
      });
    }

    next();
  }
}
