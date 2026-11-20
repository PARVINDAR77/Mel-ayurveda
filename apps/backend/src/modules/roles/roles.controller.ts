import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleType } from '@prisma/client';

export interface RoleMetadata {
  role: RoleType;
  title: string;
  prefix: string;
  description: string;
  panelUrl: string;
}

@ApiTags('Roles & Permissions (Bundle 03)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  @Get()
  @ApiOperation({ summary: 'List all system roles with employee code prefixes and capabilities' })
  @ApiResponse({ status: 200, description: 'Role definitions returned' })
  getRoles(): RoleMetadata[] {
    return [
      {
        role: RoleType.SUPER_ADMIN,
        title: 'Super Administrator',
        prefix: 'MEL-ADM-',
        description: 'Complete organization control, employee administration, lead assignment, and master analytics',
        panelUrl: '/admin/dashboard',
      },
      {
        role: RoleType.SALESPERSON,
        title: 'Ayurvedic Health Consultant (Tele-Sales)',
        prefix: 'MEL-SAL-',
        description: 'Calling assigned leads, assessing health needs, outcome logging, and follow-ups. Strictly hidden lead source.',
        panelUrl: '/sales/dashboard',
      },
      {
        role: RoleType.PENDING_REVIEWER,
        title: 'Quality & Clinical Review Officer',
        prefix: 'MEL-PND-',
        description: 'Triage queue, investigating complex leads, customer re-contact, and 4-way decision resolution',
        panelUrl: '/pending/queue',
      },
      {
        role: RoleType.APPROVAL_OFFICER,
        title: 'Commercial & Medical Approval Head',
        prefix: 'MEL-APR-',
        description: 'Final clinical and commercial verification gatekeeper; authorizes customer conversion',
        panelUrl: '/approval/queue',
      },
      {
        role: RoleType.MANAGEMENT,
        title: 'Operations, Inventory & Dispatch Officer',
        prefix: 'MEL-MGT-',
        description: 'Customer CRM, product catalog, sales draft confirmation, GST invoicing, and courier tracking',
        panelUrl: '/management/dashboard',
      },
    ];
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Get comprehensive role-permission authorization matrix' })
  @ApiResponse({ status: 200, description: 'Role-permission matrix returned' })
  getRolePermissionMatrix() {
    return {
      roles: Object.values(RoleType),
      permissions: [
        {
          module: 'Authentication',
          permission: 'auth:login',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.PENDING_REVIEWER, RoleType.APPROVAL_OFFICER, RoleType.MANAGEMENT],
        },
        {
          module: 'Employee Administration',
          permission: 'employee:manage',
          allowedRoles: [RoleType.SUPER_ADMIN],
        },
        {
          module: 'Lead Sources',
          permission: 'lead_source:view',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.MANAGEMENT], // SALESPERSON FORBIDDEN!
        },
        {
          module: 'Leads',
          permission: 'lead:create_manual',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.MANAGEMENT],
        },
        {
          module: 'Leads',
          permission: 'lead:view_assigned',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.SALESPERSON],
        },
        {
          module: 'Calling',
          permission: 'call:log',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.PENDING_REVIEWER],
        },
        {
          module: 'Pending Review',
          permission: 'pending:decide',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.PENDING_REVIEWER],
        },
        {
          module: 'Approval',
          permission: 'approval:decide',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.APPROVAL_OFFICER],
        },
        {
          module: 'Operations',
          permission: 'operations:manage',
          allowedRoles: [RoleType.SUPER_ADMIN, RoleType.MANAGEMENT],
        },
      ],
    };
  }
}
