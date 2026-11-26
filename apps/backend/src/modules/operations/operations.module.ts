import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    InvoicesController,
    InventoryController,
    DispatchController,
    ReturnsController,
  ],
  providers: [
    InvoicesService,
    InventoryService,
    DispatchService,
    ReturnsService,
  ],
  exports: [
    InvoicesService,
    InventoryService,
    DispatchService,
    ReturnsService,
  ],
})
export class OperationsModule {}
