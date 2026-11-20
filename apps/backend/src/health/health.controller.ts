import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'System and database health check' })
  @ApiResponse({ status: 200, description: 'Health check status returned successfully' })
  async checkHealth() {
    return this.healthService.getHealthStatus();
  }
}
