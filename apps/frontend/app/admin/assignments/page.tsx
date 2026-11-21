'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import {
  UserCheck,
  RefreshCw,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  ArrowRight,
  ShieldAlert,
  Send,
  Zap,
} from 'lucide-react';

export default function LeadAssignmentsAdminPage() {
  const [unassignedLeads, setUnassignedLeads] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Single Assign Modal
  const [assignTargetLead, setAssignTargetLead] = useState<any | null>(null);
  const [targetSalespersonId, setTargetSalespersonId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Add Manual Lead Modal
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    phoneNumber: '',
    city: '',
    state: 'Gujarat',
    productInterest: 'Artho-Care Ayurvedic Joint Therapy',
    priority: 'NORMAL',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [leadsRes, repsRes] = await Promise.all([
        apiClient.get('/lead-assignments/unassigned'),
        apiClient.get('/employees?role=SALESPERSON&limit=100'),
      ]);

      setUnassignedLeads(leadsRes.data || []);
      const activeReps = (repsRes.data.data || []).filter((r: any) => r.isActive);
      setSalespeople(activeReps);
      if (activeReps.length > 0) {
        setTargetSalespersonId(activeReps[0].id);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoundRobin = async () => {
    try {
      setIsDistributing(true);
      setError(null);
      const res = await apiClient.post('/lead-assignments/distribute/round-robin', {});
      setSuccessMsg(
        `Automated Round-Robin executed: Distributed ${res.data.assignedCount} leads across ${res.data.salespeopleCount} active sales consultants.`,
      );
      setSelectedLeadIds([]);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsDistributing(false);
    }
  };

  const handleSingleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetLead || !targetSalespersonId) return;

    try {
      setIsAssigning(true);
      setError(null);
      await apiClient.post('/lead-assignments/assign', {
        leadId: assignTargetLead.id,
        salespersonId: targetSalespersonId,
      });

      const assignedRep = salespeople.find((s) => s.id === targetSalespersonId);
      setSuccessMsg(
        `Lead ${assignTargetLead.leadCode} successfully assigned to ${assignedRep?.firstName} ${assignedRep?.lastName} (${assignedRep?.employeeCode}).`,
      );
      setAssignTargetLead(null);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0 || !targetSalespersonId) return;

    try {
      setIsAssigning(true);
      setError(null);
      const res = await apiClient.post('/lead-assignments/bulk', {
        leadIds: selectedLeadIds,
        salespersonId: targetSalespersonId,
      });

      const assignedRep = salespeople.find((s) => s.id === targetSalespersonId);
      setSuccessMsg(
        `Bulk Assignment complete: ${res.data.assignedCount} leads assigned to ${assignedRep?.firstName} ${assignedRep?.lastName}.`,
      );
      setSelectedLeadIds([]);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingLead(true);
      setError(null);
      const res = await apiClient.post('/leads/manual', leadForm);
      setSuccessMsg(`Customer Lead ${res.data.leadCode} (${res.data.customerName}) created successfully!`);
      setIsAddLeadModalOpen(false);
      setLeadForm({
        customerName: '',
        phoneNumber: '',
        city: '',
        state: 'Gujarat',
        productInterest: 'Artho-Care Ayurvedic Joint Therapy',
        priority: 'NORMAL',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === unassignedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(unassignedLeads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={unassignedLeads.length > 0 && selectedLeadIds.length === unassignedLeads.length}
          onChange={toggleSelectAll}
          className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 h-4 w-4"
        />
      ) as any,
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedLeadIds.includes(item.id)}
          onChange={() => toggleSelectLead(item.id)}
          className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 h-4 w-4"
        />
      ),
    },
    {
      key: 'leadCode',
      header: 'Lead Code',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80">
          {item.leadCode}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Inquiry',
      render: (item) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{item.customerName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span className="font-mono text-[11px] text-slate-600 font-medium">{item.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'productInterest',
      header: 'Medicine / Regimen',
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          {item.productInterest || 'General Ayurvedic Consultation'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => <Badge variant="priority">{item.priority}</Badge>,
    },
    {
      key: 'city',
      header: 'Location',
      render: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate">{item.city ? `${item.city}, ${item.state || ''}` : 'Gujarat'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAssignTargetLead(item)}
          className="border-emerald-300 bg-emerald-50/40 hover:bg-emerald-100/60 text-emerald-900 font-medium text-xs"
        >
          Assign Rep
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-widest">
              Panel 01: Lead Allocator
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            Lead Distribution & Assignment Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated round-robin balancing, unassigned lead triage queue, and manual single or bulk allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddLeadModalOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            + Add Manual Lead
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handleRoundRobin}
            isLoading={isDistributing}
            disabled={unassignedLeads.length === 0 || salespeople.length === 0}
            icon={<Zap className="h-3.5 w-3.5" />}
            className="shadow-sm"
          >
            Run Round-Robin
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-amber-500 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unassigned Lead Queue</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{unassignedLeads.length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Leads awaiting sales consultant allocation</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shadow-xs">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 border-t-3 border-t-emerald-600 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Sales Consultants</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{salespeople.length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Ready to receive leads in round-robin pool</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/80 shadow-xs">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when leads are selected) */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-sm animate-pulse-subtle">
          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected for bulk allocation:
          </span>
          <div className="flex items-center gap-2">
            <select
              value={targetSalespersonId}
              onChange={(e) => setTargetSalespersonId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-xs"
            >
              {salespeople.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.employeeCode} - {rep.firstName} {rep.lastName}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkAssign}
              isLoading={isAssigning}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
            >
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Unassigned Leads Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Unassigned Customer Inquiries</h3>
            <p className="text-xs text-slate-500">Select leads to bulk assign or click individual row action</p>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={unassignedLeads}
          searchKey="customerName"
          searchPlaceholder="Search unassigned leads by customer name..."
          isLoading={isLoading}
          emptyMessage="All leads are currently assigned! Queue is 100% clear."
        />
      </div>

      {/* Single Assign Modal */}
      <Modal
        isOpen={!!assignTargetLead}
        onClose={() => setAssignTargetLead(null)}
        title={`Assign Lead ${assignTargetLead?.leadCode}`}
        description={`Allocate customer inquiry ${assignTargetLead?.customerName} (${assignTargetLead?.phoneNumber}) to an active sales consultant.`}
      >
        <form onSubmit={handleSingleAssign} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select Sales Consultant
            </label>
            <select
              value={targetSalespersonId}
              onChange={(e) => setTargetSalespersonId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
            >
              {salespeople.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.employeeCode} - {rep.firstName} {rep.lastName} ({rep.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignTargetLead(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAssigning}
              className="bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Manual Lead Modal */}
      <Modal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        title="Create New Customer Product Lead"
        description="Manually ingest a new prospective buyer inquiry for Ayurvedic medicine products."
      >
        <form onSubmit={handleCreateManualLead} className="space-y-3.5">
          <Input
            label="Customer Full Name"
            value={leadForm.customerName}
            onChange={(e) => setLeadForm({ ...leadForm, customerName: e.target.value })}
            placeholder="e.g. Rajesh Patel"
            required
          />

          <Input
            label="Primary 10-Digit Mobile Number"
            value={leadForm.phoneNumber}
            onChange={(e) => setLeadForm({ ...leadForm, phoneNumber: e.target.value })}
            placeholder="98XXXXXXXX"
            leftIcon={<Phone className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={leadForm.city}
              onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
              placeholder="e.g. Surat"
            />
            <Input
              label="State"
              value={leadForm.state}
              onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
              placeholder="e.g. Gujarat"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Interested Ayurvedic Product / Concern
            </label>
            <select
              value={leadForm.productInterest}
              onChange={(e) => setLeadForm({ ...leadForm, productInterest: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Artho-Care Ayurvedic Joint Therapy">Artho-Care Ayurvedic Joint Therapy</option>
              <option value="Pure Himalayan Shilajit & Ashwagandha Kit">Pure Himalayan Shilajit & Ashwagandha Kit</option>
              <option value="Digestive Churna & Liv-Shuddhi Kwath">Digestive Churna & Liv-Shuddhi Kwath</option>
              <option value="Skin Glow Elixir & Triphala Course">Skin Glow Elixir & Triphala Course</option>
              <option value="General Ayurvedic Health Consultation">General Ayurvedic Health Consultation</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Priority Level
            </label>
            <select
              value={leadForm.priority}
              onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority (Requested Callback)</option>
              <option value="URGENT">Urgent (Immediate Purchase Intent)</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Customer Inquiry Notes
            </label>
            <textarea
              value={leadForm.notes}
              onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              placeholder="e.g. Inquiring for 60-day joint pain churna course."
              rows={2}
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddLeadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingLead}
              className="bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
