import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RecycleBinModule } from '../recycle-bin/recycle-bin.module';

@Module({
  imports: [RecycleBinModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
