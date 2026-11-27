'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { CreateLeadModal } from '../../../components/sales/create-lead-modal';
import { CreateOrderModal } from '../../../components/sales/create-order-modal';
import { ScheduleFollowUpModal } from '../../../components/sales/schedule-follow-up-modal';
import { ExportButton } from '../../../components/ui/export-button';
import { ExcelColumnDef } from '../../../lib/export-excel';
import { OFFICIAL_SALES_LEADS_EXPORT_COLUMNS } from '../../../lib/official-sales-export';
import {
  UserPlus,
  RefreshCw,
  PhoneCall,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  CalendarClock,
} from 'lucide-react';

export default function MyAssignedLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedLeadForOrder, setSelectedLeadForOrder] = useState<any | null>(null);
  const [isScheduleFollowUpOpen, setIsScheduleFollowUpOpen] = useState(false);
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<any | null>(null);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/leads?limit=100');
      setLeads(res.data?.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const onLeadCreated = () => fetchLeads();
    const onOrderCreated = () => fetchLeads();
    const onFollowUpScheduled = () => fetchLeads();
    window.addEventListener('lead-created', onLeadCreated);
    window.addEventListener('order-created', onOrderCreated);
    window.addEventListener('followup-scheduled', onFollowUpScheduled);
    return () => {
      window.removeEventListener('lead-created', onLeadCreated);
      window.removeEventListener('order-created', onOrderCreated);
      window.removeEventListener('followup-scheduled', onFollowUpScheduled);
    };
  }, []);

  const handleLeadCreated = (newLead: any) => {
    setSuccessMsg(`New Lead ${newLead.leadCode} registered successfully and assigned to your desk!`);
    fetchLeads();
  };

  const handleOrderCreated = (order: any) => {
    setSuccessMsg(`Prescription Order ${order.orderNumber} successfully booked and forwarded to Approval Officer queue!`);
    fetchLeads();
  };

  const handleFollowUpScheduled = (followUp: any) => {
    const timeFormatted = new Date(followUp.scheduledTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    setSuccessMsg(`Follow-up callback scheduled for ${timeFormatted}. You will receive a reminder notification on that date!`);
    fetchLeads();
  };

  // STRICT INVARIANT: ZERO SOURCE COLUMN IN THIS SALES TABLE (SOURCES VISIBLE ONLY IN SUPER ADMIN)
  const columns: Column<any>[] = [
    {
      key: 'leadCode',
      header: 'Lead Code',
      className: 'whitespace-nowrap min-w-[130px]',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap inline-block">
          {item.leadCode}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customerName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5 whitespace-nowrap">
            <span>{item.phoneNumber}</span>
            {item.alternatePhone && (
              <span className="text-slate-400">/ {item.alternatePhone}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'productInterest',
      header: 'Clinical Concern / Notes',
      className: 'min-w-[180px] max-w-[240px]',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-800 text-xs">{item.productInterest || 'Ayurvedic Consultation'}</span>
          {item.notes && (
            <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">&quot;{item.notes}&quot;</p>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      className: 'whitespace-nowrap min-w-[140px]',
      render: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap shrink-0">
          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
          <span>{item.city ? `${item.city}, ${item.state || ''}` : 'Location N/A'}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      className: 'whitespace-nowrap min-w-[90px]',
      render: (item) => <Badge variant="priority">{item.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'whitespace-nowrap min-w-[130px]',
      render: (item) => <Badge variant="leadStatus">{item.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap min-w-[310px]',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
          {item.status !== 'APPROVAL_REQUESTED' && item.status !== 'APPROVED' && item.status !== 'CONVERTED' ? (
            <>
              {/* Send for Approval: Opens Order Builder to prescribe formulation deal */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedLeadForOrder(item);
                  setIsCreateOrderOpen(true);
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1 h-7 shadow-sm whitespace-nowrap shrink-0"
                icon={<ShoppingBag className="h-3 w-3 text-amber-300" />}
                title="Convinced Customer - Prescribe Formulations & Send for Approval"
              >
                Send for Approval
              </Button>

              {/* Schedule Follow-up Callback */}
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  setSelectedLeadForFollowUp(item);
                  setIsScheduleFollowUpOpen(true);
                }}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium text-[11px] px-2 py-1 h-7 whitespace-nowrap shrink-0"
                icon={<CalendarClock className="h-3 w-3 text-amber-700" />}
                title="Customer Needs Time - Schedule Callback Date & Time"
              >
                Follow Up
              </Button>
            </>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 whitespace-nowrap shrink-0">
              {item.status === 'APPROVAL_REQUESTED' ? 'In Approval Queue' : 'Deal Cleared'}
            </span>
          )}

          <Link href={`/sales/calling?leadId=${item.id}`} className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<PhoneCall className="h-3 w-3 text-blue-600" />}
              className="text-[11px] px-2.5 py-1 h-7 whitespace-nowrap shrink-0"
              title="Open Telephonic Calling Console"
            >
              Call
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Official 27-column Melayurveda Sales Excel Export Template
  const leadsExportColumns: ExcelColumnDef[] = OFFICIAL_SALES_LEADS_EXPORT_COLUMNS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            My Assigned Product Leads
          </h2>
          <p className="text-xs text-slate-500">
            Customer product inquiries allocated to your sales desk. All marketing source tags are strictly quarantined.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            data={leads}
            columns={leadsExportColumns}
            fileName="Melayurveda_Sales_Leads"
            sheetName="Assigned Leads"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateLeadOpen(true)}
            icon={<UserPlus className="h-3.5 w-3.5" />}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
          >
            + Register New Lead
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setSelectedLeadForOrder(null);
              setIsCreateOrderOpen(true);
            }}
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
            className="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-extrabold shadow-sm"
          >
            Create Order
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Leads Table */}
      <DataTable
        columns={columns}
        data={leads}
        searchKey="customerName"
        searchPlaceholder="Search assigned customer leads by name or phone..."
        isLoading={isLoading}
        emptyMessage="No assigned leads in your portfolio."
        exportConfig={{
          fileName: 'Melayurveda_Sales_Leads',
          sheetName: 'Assigned Leads',
          columns: leadsExportColumns,
        }}
      />

      {/* 6-Field Lead Ingestion Modal */}
      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        onLeadCreated={handleLeadCreated}
      />

      {/* Disease-First Order Creation Modal with Editable Pricing */}
      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => {
          setIsCreateOrderOpen(false);
          setSelectedLeadForOrder(null);
        }}
        lead={selectedLeadForOrder}
        onOrderCreated={handleOrderCreated}
      />

      {/* Manual Callback / Follow-Up Scheduler Modal */}
      <ScheduleFollowUpModal
        isOpen={isScheduleFollowUpOpen}
        onClose={() => {
          setIsScheduleFollowUpOpen(false);
          setSelectedLeadForFollowUp(null);
        }}
        lead={selectedLeadForFollowUp}
        onScheduled={handleFollowUpScheduled}
      />
    </div>
  );
}
