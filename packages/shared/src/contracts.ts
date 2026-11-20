import { RoleType, LeadStatus, LeadPriority, LeadSourceType, CallOutcome } from './enums';

export interface SystemHealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    provider: string;
    latencyMs?: number;
    error?: string;
  };
  environment: string;
  version: string;
}

export interface UserSummaryDto {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: RoleType;
  isActive: boolean;
  isAcceptingLeads: boolean;
}

export interface SalespersonLeadDto {
  id: string;
  leadCode: string;
  customerName: string;
  phoneNumber: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  address?: string;
  productInterest?: string;
  priority: LeadPriority;
  status: LeadStatus;
  assignedAt?: string;
  lastContactedAt?: string;
}

export interface AdminLeadDto extends SalespersonLeadDto {
  sourceType: LeadSourceType;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adId?: string;
  costPerLead?: number;
  externalLeadId?: string;
}
