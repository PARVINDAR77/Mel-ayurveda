import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthStatus() {
    const dbHealth = await this.prisma.checkDatabaseHealth();
    return {
      status: dbHealth.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'Melayurveda CRM Core API',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        provider: 'postgresql',
        connected: dbHealth.connected,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },
    };
  }
}
