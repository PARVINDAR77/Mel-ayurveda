import { Module, Global } from '@nestjs/common';
import { WafService } from './waf.service';
import { WafController } from './waf.controller';
import { WafMiddleware } from './waf.middleware';
import { WafAntiScrapingGuard } from './waf-anti-scraping.guard';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [WafController],
  providers: [WafService, WafMiddleware, WafAntiScrapingGuard],
  exports: [WafService, WafMiddleware, WafAntiScrapingGuard],
})
export class WafModule {}
