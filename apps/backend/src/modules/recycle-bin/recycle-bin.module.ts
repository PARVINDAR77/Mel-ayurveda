import { Module } from '@nestjs/common';
import { RecycleBinService } from './recycle-bin.service';
import { RecycleBinController } from './recycle-bin.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecycleBinController],
  providers: [RecycleBinService],
  exports: [RecycleBinService],
})
export class RecycleBinModule {}
