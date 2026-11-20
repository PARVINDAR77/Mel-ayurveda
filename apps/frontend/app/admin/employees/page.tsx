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
} from 'lucide-react';

export default function EmployeesAdminPage() {
  const [employees, setEmployees] = useState<any[]>([]);
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
      const res = await apiClient.post('/employees', formData);
      setSuccessMsg(`Employee created successfully with ID: ${res.data.employeeCode}`);
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
      await apiClient.patch(`/employees/${employee.id}/toggle-status`, {
        isActive: newStatus,
      });
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, isActive: newStatus } : emp,
        ),
      );
      setSuccessMsg(
        `Employee ${employee.employeeCode} marked as ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}`,
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
      await apiClient.patch(`/employees/${resetEmployee.id}/reset-password`, {
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

  const columns: Column<any>[] = [
    {
      key: 'employeeCode',
      header: 'Employee ID',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.employeeCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Full Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">
            {item.firstName} {item.lastName}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
            <Mail className="h-3 w-3 text-slate-400" />
            <span>{item.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'CRM Role',
      render: (item) => <Badge variant="role">{item.role}</Badge>,
    },
    {
      key: 'phoneNumber',
      header: 'Contact',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
          <Phone className="h-3 w-3 text-slate-400" />
          <span>{item.phoneNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (item) => (
        <Badge variant={item.isActive ? 'success' : 'danger'}>
          {item.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setResetEmployee(item)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Reset Password"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(item)}
            className={`rounded p-1 transition ${
              item.isActive
                ? 'text-slate-500 hover:bg-red-50 hover:text-red-700'
                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
            title={item.isActive ? 'Deactivate Account' : 'Activate Account'}
          >
            <Power className="h-4 w-4" />
          </button>
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
            Employees & User Administration
          </h2>
          <p className="text-xs text-slate-500">
            Manage corporate staff, auto-sequential ID generation, role permissions, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          >
            Add New Employee
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

      {/* Employees Table */}
      <DataTable
        columns={columns}
        data={employees}
        searchKey="email"
        searchPlaceholder="Search by email or name..."
        isLoading={isLoading}
        emptyMessage="No employees registered in CRM"
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Melayurveda Employee"
        description="Creates an enterprise staff account with auto-generated sequential ID (MEL-XXX)."
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
            label="Corporate Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ramesh.patel@melayurveda.com"
            required
          />

          <Input
            label="Mobile Number"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="9876543210"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Assigned Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
            >
              <option value="SALESPERSON">Salesperson (MEL-SAL-XXX)</option>
              <option value="PENDING_REVIEWER">Pending Reviewer (MEL-PND-XXX)</option>
              <option value="APPROVAL_OFFICER">Approval Officer (MEL-APR-XXX)</option>
              <option value="MANAGEMENT">Management & Operations (MEL-MGT-XXX)</option>
              <option value="SUPER_ADMIN">Super Admin (MEL-ADM-XXX)</option>
            </select>
          </div>

          <Input
            label="Temporary Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 8 characters"
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
            >
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetEmployee}
        onClose={() => setResetEmployee(null)}
        title={`Reset Password for ${resetEmployee?.employeeCode}`}
        description={`Set a new secure password for ${resetEmployee?.firstName} ${resetEmployee?.lastName}.`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
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
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
