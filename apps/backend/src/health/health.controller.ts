import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System and database health check' })
  @ApiResponse({ status: 200, description: 'Health check status returned successfully' })
  async checkHealth() {
    return this.healthService.getHealthStatus();
  }

  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes/Docker liveness probe' })
  @ApiResponse({ status: 200, description: 'Process is alive and responding' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes/Docker readiness probe validating database connectivity' })
  @ApiResponse({ status: 200, description: 'Application dependencies are healthy and ready' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
