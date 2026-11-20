import { LeadPriority, LeadStatus, LeadSourceType } from '@prisma/client';

/**
 * Sanitizes lead records for Salesperson users.
 * STRICT SECURITY INVARIANT: Under no circumstances does this DTO expose:
 * - sourceId
 * - sourceType
 * - campaignId
 * - campaignName
 * - adSetId
 * - adId
 * - costPerLead
 * - externalLeadId
 * - rawPayload
 */
export function sanitizeLeadForSalesperson(lead: any) {
  return {
    id: lead.id,
    leadCode: lead.leadCode,
    customerName: lead.customerName,
    phoneNumber: lead.phoneNumber,
    alternatePhone: lead.alternatePhone,
    email: lead.email,
    city: lead.city,
    state: lead.state,
    address: lead.address,
    productInterest: lead.productInterest,
    customerRequirements: lead.customerRequirements,
    notes: lead.notes,
    priority: lead.priority,
    status: lead.status,
    assignedAt: lead.assignedAt,
    lastContactedAt: lead.lastContactedAt,
    createdAt: lead.createdAt,
    assignedTo: lead.assignedTo
      ? {
          id: lead.assignedTo.id,
          employeeCode: lead.assignedTo.employeeCode,
          firstName: lead.assignedTo.firstName,
          lastName: lead.assignedTo.lastName,
        }
      : null,
    callLogs: lead.callLogs,
    followUps: lead.followUps,
  };
}

/**
 * Full lead DTO for Super Admin and Management users including all source intelligence
 */
export function formatLeadForAdmin(lead: any) {
  return {
    ...sanitizeLeadForSalesperson(lead),
    sourceId: lead.sourceId,
    sourceType: lead.sourceType,
    source: lead.source ? { id: lead.source.id, name: lead.source.name } : null,
    campaignId: lead.campaignId,
    campaignName: lead.campaignName,
    adSetId: lead.adSetId,
    adId: lead.adId,
    externalLeadId: lead.externalLeadId,
    costPerLead: lead.costPerLead,
    createdBy: lead.createdBy
      ? {
          id: lead.createdBy.id,
          employeeCode: lead.createdBy.employeeCode,
          firstName: lead.createdBy.firstName,
          lastName: lead.createdBy.lastName,
        }
      : null,
  };
}
