import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { LeadSourcesModule } from './modules/lead-sources/lead-sources.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LeadAssignmentsModule } from './modules/lead-assignments/lead-assignments.module';
import { CallingModule } from './modules/calling/calling.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';
import { PendingReviewsModule } from './modules/pending-reviews/pending-reviews.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OperationsModule } from './modules/operations/operations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { CustomerFollowupsModule } from './modules/customer-followups/customer-followups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    LeadSourcesModule,
    LeadsModule,
    LeadAssignmentsModule,
    CallingModule,
    FollowUpsModule,
    PendingReviewsModule,
    ApprovalsModule,
    CustomersModule,
    ProductsModule,
    OrdersModule,
    OperationsModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
    CustomerFollowupsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

