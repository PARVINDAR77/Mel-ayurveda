import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecycleBinQueryDto } from './dto/recycle-bin-query.dto';
import { RoleType } from '@prisma/client';

export interface ArchiveRecordParams {
  entityType: 'EMPLOYEE' | 'PRODUCT' | 'LEAD' | 'ORDER' | 'DISEASE';
  entityId: string;
  itemIdentifier: string;
  displayName: string;
  category?: string;
  dataSnapshot: Record<string, any>;
  deleteReason?: string;
  actorId: string;
  actorCode: string;
}

@Injectable()
export class RecycleBinService {
  private readonly logger = new Logger(RecycleBinService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Archive an entity snapshot into the 30-Day Recovery Vault
   */
  async archiveRecord(params: ArchiveRecordParams) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Calendar Days

    const archived = await this.prisma.recycleBinItem.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        itemIdentifier: params.itemIdentifier,
        displayName: params.displayName,
        category: params.category || null,
        dataSnapshot: params.dataSnapshot,
        deleteReason: params.deleteReason || 'Super Admin requested removal',
        deletedById: params.actorId,
        deletedByCode: params.actorCode,
        expiresAt,
        isRestored: false,
      },
    });

    this.logger.log(
      `Archived ${params.entityType} ${params.itemIdentifier} to Recycle Bin (Expires in 30 days: ${expiresAt.toISOString()})`,
    );
    return archived;
  }

  /**
   * Retrieve all items in the recovery vault with computed countdowns
   */
  async findAll(query: RecycleBinQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      isRestored: false,
    };

    if (query.entityType && query.entityType !== 'ALL') {
      where.entityType = query.entityType;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { itemIdentifier: { contains: s, mode: 'insensitive' } },
        { displayName: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { deletedByCode: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.recycleBinItem.count({ where }),
      this.prisma.recycleBinItem.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const now = Date.now();
    const enriched = items.map((item) => {
      const msLeft = item.expiresAt.getTime() - now;
      const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      const isUrgent = daysRemaining <= 7;
      return {
        ...item,
        daysRemaining,
        isUrgent,
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve vault summary metrics
   */
  async getMetrics() {
    const now = new Date();
    const urgentThreshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [totalInVault, expiringSoon, restoredCount, countsByType] = await Promise.all([
      this.prisma.recycleBinItem.count({ where: { isRestored: false } }),
      this.prisma.recycleBinItem.count({
        where: {
          isRestored: false,
          expiresAt: { lte: urgentThreshold },
        },
      }),
      this.prisma.recycleBinItem.count({ where: { isRestored: true } }),
      this.prisma.recycleBinItem.groupBy({
        by: ['entityType'],
        where: { isRestored: false },
        _count: { _all: true },
      }),
    ]);

    const entityTypeCounts: Record<string, number> = {
      EMPLOYEE: 0,
      PRODUCT: 0,
      LEAD: 0,
      ORDER: 0,
    };
    for (const c of countsByType) {
      entityTypeCounts[c.entityType] = c._count._all;
    }

    return {
      totalInVault,
      expiringSoon,
      restoredCount,
      retentionDays: 30,
      entityTypeCounts,
    };
  }

  /**
   * Get single item by ID with full snapshot
   */
  async findById(id: string) {
    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Recycle bin item ${id} not found`);
    }

    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((item.expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)));

    return {
      ...item,
      daysRemaining,
      isUrgent: daysRemaining <= 7,
    };
  }

  /**
   * Safely restore an archived record back into its live database table
   */
  async restoreRecord(id: string, actorId: string, actorCode: string) {
    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Recycle bin item ${id} not found`);
    }

    if (item.isRestored) {
      throw new BadRequestException(`Item ${item.itemIdentifier} has already been restored.`);
    }

    const snapshot = item.dataSnapshot as Record<string, any>;

    const restoredEntity = await this.prisma.$transaction(async (tx) => {
      let createdOrRestored: any = null;

      if (item.entityType === 'EMPLOYEE') {
        // Collision guard: ensure email is not occupied
        const emailCollision = await tx.user.findUnique({
          where: { email: snapshot.email },
        });
        if (emailCollision) {
          throw new ConflictException(
            `Cannot restore employee: Email '${snapshot.email}' is currently in use by employee ${emailCollision.employeeCode}.`,
          );
        }

        // Collision guard: ensure employeeCode is not occupied
        const codeCollision = await tx.user.findUnique({
          where: { employeeCode: snapshot.employeeCode },
        });
        if (codeCollision) {
          throw new ConflictException(
            `Cannot restore employee: Employee code '${snapshot.employeeCode}' is currently active.`,
          );
        }

        createdOrRestored = await tx.user.create({
          data: {
            id: snapshot.id || item.entityId,
            employeeCode: snapshot.employeeCode,
            email: snapshot.email,
            passwordHash: snapshot.passwordHash || '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
            firstName: snapshot.firstName,
            lastName: snapshot.lastName,
            phoneNumber: snapshot.phoneNumber,
            role: snapshot.role as RoleType,
            isActive: false, // Restored in deactivated state for admin review
            isAcceptingLeads: false,
          },
        });
      } else if (item.entityType === 'PRODUCT') {
        const skuCollision = await tx.product.findUnique({
          where: { sku: snapshot.sku },
        });
        if (skuCollision) {
          throw new ConflictException(
            `Cannot restore formulation: SKU '${snapshot.sku}' already exists in catalog.`,
          );
        }

        createdOrRestored = await tx.product.create({
          data: {
            id: snapshot.id || item.entityId,
            sku: snapshot.sku,
            name: snapshot.name,
            dosageForm: snapshot.dosageForm || 'Herbal Compound',
            dosageInstructions: snapshot.dosageInstructions || '1 dose daily',
            targetDisease: snapshot.targetDisease || 'General Wellness',
            ingredients: snapshot.ingredients || 'Ayurvedic Extracts',
            mrpPrice: snapshot.mrpPrice || snapshot.mrp || 0,
            sellingPrice: snapshot.sellingPrice,
            gstRate: snapshot.gstRate || 12.0,
            categoryId: snapshot.categoryId,
            isActive: true,
          },
        });
      } else if (item.entityType === 'LEAD') {
        const leadCodeCollision = await tx.lead.findUnique({
          where: { leadCode: snapshot.leadCode },
        });
        if (leadCodeCollision) {
          throw new ConflictException(`Cannot restore lead: Lead code '${snapshot.leadCode}' already exists.`);
        }

        createdOrRestored = await tx.lead.create({
          data: {
            id: snapshot.id || item.entityId,
            leadCode: snapshot.leadCode,
            customerName: snapshot.customerName,
            phoneNumber: snapshot.phoneNumber,
            alternatePhone: snapshot.alternatePhone,
            city: snapshot.city,
            state: snapshot.state,
            address: snapshot.address,
            productInterest: snapshot.productInterest || snapshot.disease,
            status: snapshot.status,
            priority: snapshot.priority,
            sourceId: snapshot.sourceId,
            assignedToId: snapshot.assignedToId,
          },
        });
      } else {
        throw new BadRequestException(`Restoration for entity type '${item.entityType}' is not supported.`);
      }

      // Mark recycle bin item as restored
      await tx.recycleBinItem.update({
        where: { id },
        data: {
          isRestored: true,
          restoredAt: new Date(),
          restoredById: actorId,
          restoredByCode: actorCode,
        },
      });

      // Record immutable audit entry
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: `${item.entityType}_RESTORED`,
          entityType: item.entityType,
          entityId: item.entityId,
          newState: {
            itemIdentifier: item.itemIdentifier,
            displayName: item.displayName,
            restoredBy: actorCode,
          },
        },
      });

      return createdOrRestored;
    });

    this.logger.log(`Restored ${item.entityType} ${item.itemIdentifier} by admin ${actorCode}`);
    return {
      success: true,
      message: `${item.displayName} (${item.itemIdentifier}) has been successfully restored to the active database.`,
      entity: restoredEntity,
    };
  }

  /**
   * Super Admin Early Permanent Purge (ahead of 30-day window)
   */
  async permanentPurge(id: string, actorId: string, actorCode: string) {
    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Recycle bin item ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'RECYCLE_BIN_PERMANENT_PURGE',
          entityType: item.entityType,
          entityId: item.entityId,
          oldState: {
            itemIdentifier: item.itemIdentifier,
            displayName: item.displayName,
            deletedAt: item.deletedAt,
            purgedBy: actorCode,
          },
        },
      });

      await tx.recycleBinItem.delete({ where: { id } });
    });

    this.logger.log(`Permanently purged ${item.entityType} ${item.itemIdentifier} by admin ${actorCode}`);
    return {
      success: true,
      message: `${item.displayName} (${item.itemIdentifier}) has been permanently purged from the vault.`,
    };
  }

  /**
   * Automated Daily 30-Day Retention Purge Worker
   * Runs nightly to delete snapshots older than 30 days
   */
  async purgeExpiredRecords() {
    const now = new Date();
    const expired = await this.prisma.recycleBinItem.findMany({
      where: {
        isRestored: false,
        expiresAt: { lte: now },
      },
      select: { id: true, itemIdentifier: true, entityType: true },
    });

    if (expired.length === 0) {
      return { purgedCount: 0, message: 'No expired items found exceeding 30-day window.' };
    }

    const { count } = await this.prisma.recycleBinItem.deleteMany({
      where: {
        id: { in: expired.map((e) => e.id) },
      },
    });

    this.logger.log(`Automated 30-day retention worker purged ${count} expired records from vault.`);
    return {
      purgedCount: count,
      message: `Successfully purged ${count} expired records exceeding 30-day retention window.`,
    };
  }
}
