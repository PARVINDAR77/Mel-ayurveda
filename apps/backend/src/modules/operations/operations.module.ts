import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [InvoicesController, InventoryController, DispatchController],
  providers: [InvoicesService, InventoryService, DispatchService],
  exports: [InvoicesService, InventoryService, DispatchService],
})
export class OperationsModule {}
