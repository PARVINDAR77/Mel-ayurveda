'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { CreateLeadModal } from '../../../components/sales/create-lead-modal';
import { CreateOrderModal } from '../../../components/sales/create-order-modal';
import {
  UserPlus,
  RefreshCw,
  PhoneCall,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingBag,
} from 'lucide-react';

export default function MyAssignedLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedLeadForOrder, setSelectedLeadForOrder] = useState<any | null>(null);

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
    window.addEventListener('lead-created', onLeadCreated);
    window.addEventListener('order-created', onOrderCreated);
    return () => {
      window.removeEventListener('lead-created', onLeadCreated);
      window.removeEventListener('order-created', onOrderCreated);
    };
  }, []);

  const handleApproveLead = async (lead: any) => {
    try {
      setActionLoadingId(lead.id);
      setError(null);
      await apiClient.post('/approvals/submit', {
        leadId: lead.id,
        notes: 'Deal approved from assigned leads list',
      });
      setSuccessMsg(`Lead ${lead.leadCode} successfully approved and forwarded to Panel 04 Approval Officer queue!`);
      fetchLeads();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePendingLead = async (lead: any) => {
    try {
      setActionLoadingId(lead.id);
      setError(null);
      await apiClient.post('/pending-reviews/submit', {
        leadId: lead.id,
        reason: 'Customer requires follow-up consultation / dosage review',
        salesNotes: 'Routed to pending queue from assigned leads table',
      });
      setSuccessMsg(`Lead ${lead.leadCode} successfully forwarded to Panel 03 Pending Review queue!`);
      fetchLeads();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeadCreated = (newLead: any) => {
    setSuccessMsg(`New Lead ${newLead.leadCode} registered successfully and assigned to your desk!`);
    fetchLeads();
  };

  const handleOrderCreated = (order: any) => {
    setSuccessMsg(`Customer Order ${order.orderNumber} successfully booked and dispatched to verification queue!`);
    fetchLeads();
  };

  // STRICT INVARIANT: ZERO SOURCE COLUMN IN THIS SALES TABLE (SOURCES VISIBLE ONLY IN SUPER ADMIN)
  const columns: Column<any>[] = [
    {
      key: 'leadCode',
      header: 'Lead Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.leadCode}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customerName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
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
      render: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 text-slate-400" />
          <span>{item.city ? `${item.city}, ${item.state || ''}` : 'Location N/A'}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => <Badge variant="priority">{item.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <Badge variant="leadStatus">{item.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Quick Create Order Button for Deal Closing */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedLeadForOrder(item);
              setIsCreateOrderOpen(true);
            }}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1 h-7 shadow-sm"
            icon={<ShoppingBag className="h-3 w-3 text-amber-300" />}
          >
            Create Order
          </Button>

          {item.status !== 'APPROVAL_REQUESTED' && item.status !== 'APPROVED' && item.status !== 'CONVERTED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApproveLead(item)}
                isLoading={actionLoadingId === item.id}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-medium text-[11px] px-2 py-1 h-7"
                icon={<CheckCircle2 className="h-3 w-3" />}
              >
                Approve
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => handlePendingLead(item)}
                isLoading={actionLoadingId === item.id}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium text-[11px] px-2 py-1 h-7"
                icon={<Clock className="h-3 w-3" />}
              >
                Pending
              </Button>
            </>
          )}

          <Link href={`/sales/calling?leadId=${item.id}`}>
            <Button variant="outline" size="sm" icon={<PhoneCall className="h-3 w-3" />} className="text-[11px] px-2.5 py-1 h-7">
              Call
            </Button>
          </Link>
        </div>
      ),
    },
  ];

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

        <div className="flex items-center gap-2">
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
    </div>
  );
}
