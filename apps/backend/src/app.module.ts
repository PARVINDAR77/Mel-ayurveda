import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
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
  ],
})
export class AppModule {}

