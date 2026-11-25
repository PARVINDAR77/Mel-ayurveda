import { Module } from '@nestjs/common';
import { CustomerFollowupsController } from './customer-followups.controller';
import { CustomerFollowupsService } from './customer-followups.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomerFollowupsController],
  providers: [CustomerFollowupsService],
  exports: [CustomerFollowupsService],
})
export class CustomerFollowupsModule {}
