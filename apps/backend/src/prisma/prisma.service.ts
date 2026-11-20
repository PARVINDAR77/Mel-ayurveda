import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully established connection with PostgreSQL database via Prisma.');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database via Prisma on startup:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL database.');
  }

  async checkDatabaseHealth(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return { connected: true, latencyMs };
    } catch (err: any) {
      return { connected: false, error: err.message || 'Database query error' };
    }
  }
}
