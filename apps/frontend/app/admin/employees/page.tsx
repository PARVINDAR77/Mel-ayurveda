'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import {
  UserPlus,
  RefreshCw,
  KeyRound,
  Shield,
  Power,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building2,
  Lock,
  Trash2,
  Activity,
} from 'lucide-react';
import { EmployeeActivityDrawer } from './employee-activity-drawer';

export default function EmployeesAdminPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'SALESPERSON',
    password: '',
  });

  // Reset Password Modal
  const [resetEmployee, setResetEmployee] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Delete Employee Modal
  const [deleteEmployee, setDeleteEmployee] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Employee Work Activity Dossier Drawer
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<any | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handleOpenDossier = (employee: any) => {
    setSelectedDossierEmployee(employee);
    setIsDossierOpen(true);
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/employees?limit=100');
      setEmployees(res.data.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      // Clean and validate Indian phone number
      let cleanPhone = formData.phoneNumber.replace(/[\s\-\+]/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = cleanPhone.slice(1);
      }

      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setError('Mobile number must be a valid 10-digit Indian number starting with 6-9 (e.g. 9825123456).');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: cleanPhone,
        role: formData.role,
        initialPassword: formData.password || undefined,
        password: formData.password || undefined,
      };

      const res = await apiClient.post('/employees', payload);
      setSuccessMsg(`Employee ${res.data.firstName} ${res.data.lastName} created with ID: ${res.data.employeeCode}`);
      setIsAddModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        role: 'SALESPERSON',
        password: '',
      });
      fetchEmployees();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employee: any) => {
    try {
      const newStatus = !employee.isActive;
      await apiClient.patch(`/employees/${employee.id}/status`, {
        isActive: newStatus,
      });
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, isActive: newStatus } : emp,
        ),
      );
      setSuccessMsg(
        `Staff member ${employee.employeeCode} (${employee.firstName} ${employee.lastName}) marked as ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}`,
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmployee) return;

    try {
      setIsResetting(true);
      setError(null);
      await apiClient.post(`/employees/${resetEmployee.id}/reset-password`, {
        newPassword,
        password: newPassword,
      });
      setSuccessMsg(`Password for ${resetEmployee.employeeCode} updated successfully.`);
      setResetEmployee(null);
      setNewPassword('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;

    try {
      setIsDeleting(true);
      setError(null);
      await apiClient.delete(`/employees/${deleteEmployee.id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== deleteEmployee.id));
      setSuccessMsg(
        `Staff member ${deleteEmployee.employeeCode} (${deleteEmployee.firstName} ${deleteEmployee.lastName}) has been permanently deleted.`,
      );
      setDeleteEmployee(null);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEmployees = React.useMemo(() => {
    if (selectedRoleFilter === 'ALL') return employees;
    return employees.filter((e) => e.role === selectedRoleFilter);
  }, [employees, selectedRoleFilter]);

  const columns: Column<any>[] = [
    {
      key: 'employeeCode',
      header: 'Employee ID',
      render: (item) => (
        <button
          type="button"
          onClick={() => handleOpenDossier(item)}
          className="font-mono font-bold text-xs text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200/80 transition cursor-pointer flex items-center gap-1.5 shadow-2xs group"
          title="Inspect Staff Performance Dossier"
        >
          <Activity className="h-3 w-3 text-emerald-700 group-hover:scale-110 transition-transform" />
          <span>{item.employeeCode}</span>
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Full Name & Email',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenDossier(item)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-200 transition cursor-pointer"
            title="Inspect Staff Performance Dossier"
          >
            {item.firstName[0]}
            {item.lastName[0]}
          </button>
          <div>
            <button
              type="button"
              onClick={() => handleOpenDossier(item)}
              className="font-bold text-slate-900 text-xs block leading-snug hover:text-emerald-700 transition cursor-pointer text-left"
            >
              {item.firstName} {item.lastName}
            </button>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Mail className="h-3 w-3 text-slate-400" />
              <span>{item.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Panel & Role',
      render: (item) => <Badge variant="role">{item.role}</Badge>,
    },
    {
      key: 'phoneNumber',
      header: 'Direct Phone',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
          <Phone className="h-3 w-3 text-slate-400" />
          <span>{item.phoneNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Session Status',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            item.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {item.isActive ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Credentials & Access',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDossier(item)}
            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 transition shadow-2xs"
            title="Inspect Work Activity & Output Dossier"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          <button
            onClick={() => setResetEmployee(item)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
            title="Reset Password"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={() => handleToggleStatus(item)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition shadow-2xs ${
              item.isActive
                ? 'border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100/60'
                : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/60'
            }`}
            title={item.isActive ? 'Deactivate Account' : 'Activate Account'}
          >
            <Power className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{item.isActive ? 'Suspend' : 'Activate'}</span>
          </button>
          <button
            onClick={() => setDeleteEmployee(item)}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-800 transition shadow-2xs"
            title="Delete Employee Record"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
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
              Panel 01: Employee Administration
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
            Employee Administration & RBAC Credentials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage corporate staff, auto-sequential ID generation, role permissions, and system access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmployees}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<UserPlus className="h-3.5 w-3.5" />}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
          >
            + Add New Employee
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

      {/* Role Filter Tabs - Executive Segmented Pill Group (Zero Native Scrollbar) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-1.5 md:gap-2 shadow-2xs">
        {[
          { key: 'ALL', label: 'All Staff Roles', panel: null, count: employees.length },
          {
            key: 'SALESPERSON',
            label: 'Sales Consultants',
            panel: 'Panel 02',
            count: employees.filter((e) => e.role === 'SALESPERSON').length,
          },
          {
            key: 'FOLLOWUP_EXECUTIVE',
            label: 'Follow-Up Care',
            panel: 'Panel 06',
            count: employees.filter((e) => e.role === 'FOLLOWUP_EXECUTIVE').length,
          },
          {
            key: 'PENDING_REVIEWER',
            label: 'Clinical Triage',
            panel: 'Panel 03',
            count: employees.filter((e) => e.role === 'PENDING_REVIEWER').length,
          },
          {
            key: 'APPROVAL_OFFICER',
            label: 'Medical Approvals',
            panel: 'Panel 04',
            count: employees.filter((e) => e.role === 'APPROVAL_OFFICER').length,
          },
          {
            key: 'MANAGEMENT',
            label: 'Operations & Mgt',
            panel: 'Panel 05',
            count: employees.filter((e) => e.role === 'MANAGEMENT').length,
          },
          {
            key: 'BILLING_EXECUTIVE',
            label: 'Billing & Stock Desk',
            panel: 'Panel 07',
            count: employees.filter((e) => e.role === 'BILLING_EXECUTIVE').length,
          },
          {
            key: 'SUPER_ADMIN',
            label: 'Super Admin',
            panel: 'Panel 01',
            count: employees.filter((e) => e.role === 'SUPER_ADMIN').length,
          },
        ].map((tab) => {
          const isActive = selectedRoleFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedRoleFilter(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm ring-1 ring-emerald-900/10'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs hover:shadow-xs'
              }`}
            >
              <span>{tab.label}</span>
              {tab.panel && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                  }`}
                >
                  {tab.panel}
                </span>
              )}
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-emerald-950 text-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredEmployees}
          searchKey="email"
          searchPlaceholder="Search employees by email, name or ID..."
          isLoading={isLoading}
          emptyMessage="No employees found matching filter criteria."
        />
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New Corporate Staff Member"
        description="Creates an authorized user account with role-based access control and auto-generated sequential ID."
      >
        <form onSubmit={handleCreateEmployee} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Ramesh"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Patel"
              required
            />
          </div>

          <Input
            label="Corporate Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="name@melayurveda.com"
            leftIcon={<Mail className="h-4 w-4" />}
            required
          />

          <Input
            label="Mobile Number (10-Digit Indian Mobile)"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="e.g. 9825123456"
            leftIcon={<Phone className="h-4 w-4" />}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Assigned Organizational Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="SALESPERSON">Panel 02: Salesperson (Tele-Consultant • 0% Source Exposure)</option>
              <option value="FOLLOWUP_EXECUTIVE">Panel 06: Follow-Up Executive (Customer Care, Wellness & Refills • MEL-FLW-)</option>
              <option value="PENDING_REVIEWER">Panel 03: Pending Reviewer (Formulation & Dosage Verification)</option>
              <option value="APPROVAL_OFFICER">Panel 04: Approval Officer (Commercial & Medical Clearance)</option>
              <option value="BILLING_EXECUTIVE">Panel 07: Billing & Stock Executive (Stock Inspection & GST Billing • MEL-BIL-)</option>
              <option value="MANAGEMENT">Panel 05: Management (GST Invoicing, Inventory & Dispatch)</option>
              <option value="SUPER_ADMIN">Panel 01: Super Admin (Executive Organization Control)</option>
            </select>
          </div>

          <Input
            label="Initial Account Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 8 characters with upper, lower, symbol"
            leftIcon={<Lock className="h-4 w-4" />}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetEmployee}
        onClose={() => setResetEmployee(null)}
        title={`Reset Password for ${resetEmployee?.employeeCode}`}
        description={`Set a new secure credential for ${resetEmployee?.firstName} ${resetEmployee?.lastName} (${resetEmployee?.email}).`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new strong password"
            leftIcon={<KeyRound className="h-4 w-4" />}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetEmployee(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isResetting}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Employee Confirmation Modal */}
      <Modal
        isOpen={!!deleteEmployee}
        onClose={() => setDeleteEmployee(null)}
        title="Delete Employee Record"
        description="Permanently remove staff credentials and access privileges from Melayurveda CRM."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-red-900">
            <p className="font-bold text-sm">
              Confirm deletion of {deleteEmployee?.firstName} {deleteEmployee?.lastName} ({deleteEmployee?.employeeCode})?
            </p>
            <p className="mt-1 text-xs text-red-700">
              Role: <span className="font-semibold">{deleteEmployee?.role}</span> | Email: <span className="font-semibold">{deleteEmployee?.email}</span>
            </p>
            <p className="mt-2 text-[11px] text-red-600 font-medium">
              ⚠️ Warning: This will permanently revoke all active login sessions, invalidate refresh tokens, and remove this employee from the system.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteEmployee(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteEmployee}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Staff Performance Dossier & Work Activity Drawer */}
      <EmployeeActivityDrawer
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          setSelectedDossierEmployee(null);
        }}
        employee={selectedDossierEmployee}
        onResetPassword={(emp) => {
          setIsDossierOpen(false);
          setResetEmployee(emp);
        }}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
