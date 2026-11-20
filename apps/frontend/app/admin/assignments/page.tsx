'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
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
} from 'lucide-react';

export default function LeadAssignmentsAdminPage() {
  const [unassignedLeads, setUnassignedLeads] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Assign Modal
  const [assignTargetLead, setAssignTargetLead] = useState<any | null>(null);
  const [targetSalespersonId, setTargetSalespersonId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

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
        `Automated Round-Robin executed: Distributed ${res.data.assignedCount} leads across ${res.data.salespeopleCount} sales consultants.`,
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
          className="rounded border-slate-300 text-forest-800 focus:ring-forest-700"
        />
      ) as any,
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedLeadIds.includes(item.id)}
          onChange={() => toggleSelectLead(item.id)}
          className="rounded border-slate-300 text-forest-800 focus:ring-forest-700"
        />
      ),
    },
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
      key: 'customer',
      header: 'Customer Details',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.customerName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span className="font-mono">{item.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'productInterest',
      header: 'Interest / Treatment',
      render: (item) => (
        <span className="font-medium text-slate-700">{item.productInterest || 'General Consultation'}</span>
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
          <MapPin className="h-3 w-3 text-slate-400" />
          <span>{item.city ? `${item.city}, ${item.state || ''}` : 'Location N/A'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAssignTargetLead(item)}
        >
          Assign Rep
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Lead Distribution & Assignment Engine
          </h2>
          <p className="text-xs text-slate-500">
            Automated round-robin balancing, unassigned lead triage queue, and bulk manual reassignment.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            variant="gold"
            size="sm"
            onClick={handleRoundRobin}
            isLoading={isDistributing}
            disabled={unassignedLeads.length === 0 || salespeople.length === 0}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Run Round-Robin Distribution
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

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Unassigned Lead Queue</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{unassignedLeads.length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Leads awaiting sales consultant allocation</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Active Sales Consultants</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{salespeople.length}</h4>
            <p className="text-xs text-slate-400 mt-0.5">Accepting leads in round-robin pool</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center border border-forest-200">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when leads are selected) */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-forest-300 bg-forest-50/70 p-3.5 shadow-sm">
          <span className="text-xs font-semibold text-forest-900">
            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected for bulk assignment:
          </span>
          <div className="flex items-center gap-2">
            <select
              value={targetSalespersonId}
              onChange={(e) => setTargetSalespersonId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-700"
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
            >
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Unassigned Leads Table */}
      <DataTable
        columns={columns}
        data={unassignedLeads}
        searchKey="customerName"
        searchPlaceholder="Search unassigned leads by customer name..."
        isLoading={isLoading}
        emptyMessage="All leads are currently assigned! Queue is clear."
      />

      {/* Single Assign Modal */}
      <Modal
        isOpen={!!assignTargetLead}
        onClose={() => setAssignTargetLead(null)}
        title={`Assign Lead ${assignTargetLead?.leadCode}`}
        description={`Allocate customer inquiry ${assignTargetLead?.customerName} (${assignTargetLead?.phoneNumber}) to a sales consultant.`}
      >
        <form onSubmit={handleSingleAssign} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select Sales Consultant
            </label>
            <select
              value={targetSalespersonId}
              onChange={(e) => setTargetSalespersonId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
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
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
