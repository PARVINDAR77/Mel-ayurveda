'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import {
  UserPlus,
  RefreshCw,
  PhoneCall,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export default function MyAssignedLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Lead Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    phoneNumber: '',
    alternatePhone: '',
    city: '',
    state: 'Gujarat',
    address: '',
    productInterest: 'Sandhivata Joint Care',
    priority: 'NORMAL',
    notes: '',
  });

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
  }, []);

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await apiClient.post('/leads/manual', manualForm);
      setSuccessMsg(`Manual Lead created successfully: ${res.data.leadCode}`);
      setIsManualModalOpen(false);
      setManualForm({
        customerName: '',
        phoneNumber: '',
        alternatePhone: '',
        city: '',
        state: 'Gujarat',
        address: '',
        productInterest: 'Sandhivata Joint Care',
        priority: 'NORMAL',
        notes: '',
      });
      fetchLeads();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // STRICT INVARIANT: ZERO SOURCE COLUMN IN THIS TABLE
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
      header: 'Patient Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customerName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
            <span>{item.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'productInterest',
      header: 'Treatment Interest',
      render: (item) => (
        <span className="font-medium text-slate-700">{item.productInterest || 'General Consultation'}</span>
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
          <Link href={`/sales/calling?leadId=${item.id}`}>
            <Button variant="primary" size="sm" icon={<PhoneCall className="h-3 w-3" />}>
              Call
            </Button>
          </Link>
          {item.status !== 'PENDING_REVIEW' && item.status !== 'APPROVED' && item.status !== 'CONVERTED' && (
            <Link href={`/sales/pending?leadId=${item.id}`}>
              <Button variant="outline" size="sm" icon={<FileCheck className="h-3 w-3" />}>
                Submit
              </Button>
            </Link>
          )}
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
            My Assigned Patient Leads
          </h2>
          <p className="text-xs text-slate-500">
            Patients allocated to your consultation desk. All marketing source tags are strictly quarantined.
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
            onClick={() => setIsManualModalOpen(true)}
            icon={<UserPlus className="h-3.5 w-3.5" />}
          >
            Create Inbound Lead
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
        searchPlaceholder="Search assigned patients by name or phone..."
        isLoading={isLoading}
        emptyMessage="No assigned leads in your portfolio."
      />

      {/* Manual Inbound Lead Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Create Inbound Patient Lead"
        description="Register a walk-in or incoming phone inquiry. Automatically allocated to your desk."
      >
        <form onSubmit={handleCreateManualLead} className="space-y-3.5">
          <Input
            label="Patient Full Name"
            value={manualForm.customerName}
            onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
            placeholder="e.g. Ramesh Patel"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Primary Phone Number"
              type="tel"
              value={manualForm.phoneNumber}
              onChange={(e) => setManualForm({ ...manualForm, phoneNumber: e.target.value })}
              placeholder="9876543210"
              required
            />
            <Input
              label="Alternate Phone (Optional)"
              type="tel"
              value={manualForm.alternatePhone}
              onChange={(e) => setManualForm({ ...manualForm, alternatePhone: e.target.value })}
              placeholder="9876500000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={manualForm.city}
              onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
              placeholder="Ahmedabad"
              required
            />
            <Input
              label="State"
              value={manualForm.state}
              onChange={(e) => setManualForm({ ...manualForm, state: e.target.value })}
              placeholder="Gujarat"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Priority
              </label>
              <select
                value={manualForm.priority}
                onChange={(e) => setManualForm({ ...manualForm, priority: e.target.value })}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Ayurvedic Formulation Interest
              </label>
              <input
                type="text"
                value={manualForm.productInterest}
                onChange={(e) => setManualForm({ ...manualForm, productInterest: e.target.value })}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                placeholder="e.g. Joint Care, Skin, Digestion"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Initial Consultation Notes
            </label>
            <textarea
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              rows={2}
              placeholder="Patient reported symptoms, age, prior treatments..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManualModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Save Inbound Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
