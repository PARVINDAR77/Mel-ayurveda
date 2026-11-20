import { Module } from '@nestjs/common';
import { PendingReviewsController } from './pending-reviews.controller';
import { PendingReviewsService } from './pending-reviews.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PendingReviewsController],
  providers: [PendingReviewsService],
  exports: [PendingReviewsService],
})
export class PendingReviewsModule {}
