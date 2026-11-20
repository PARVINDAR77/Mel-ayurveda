'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { DataTable, Column } from '../../../components/ui/data-table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Drawer } from '../../../components/ui/drawer';
import { StatCard } from '../../../components/ui/stat-card';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  FileCheck,
  ClipboardList,
} from 'lucide-react';

export default function CustomerCRMPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Customer Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Convert Approved Lead Modal state
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [approvedLeads, setApprovedLeads] = useState<any[]>([]);
  const [loadingApprovedLeads, setLoadingApprovedLeads] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [convertAddress, setConvertAddress] = useState('');
  const [convertCity, setConvertCity] = useState('');
  const [convertState, setConvertState] = useState('Gujarat');
  const [convertPincode, setConvertPincode] = useState('');
  const [convertNotes, setConvertNotes] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Direct Customer Modal state
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [directName, setDirectName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directAddress, setDirectAddress] = useState('');
  const [directCity, setDirectCity] = useState('');
  const [directState, setDirectState] = useState('Gujarat');
  const [directPincode, setDirectPincode] = useState('');
  const [directNotes, setDirectNotes] = useState('');
  const [isCreatingDirect, setIsCreatingDirect] = useState(false);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());

      const [custRes, metricsRes] = await Promise.all([
        apiClient.get(`/customers?${params.toString()}`),
        apiClient.get('/customers/metrics'),
      ]);

      setCustomers(custRes.data?.data || custRes.data || []);
      setMetrics(metricsRes.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const openCustomerDetail = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}`);
      setCustomerDetail(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedCustomerId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openConvertModal = async () => {
    setIsConvertModalOpen(true);
    setLoadingApprovedLeads(true);
    try {
      const res = await apiClient.get('/leads?status=APPROVED&limit=50');
      const leads = res.data?.data || res.data || [];
      setApprovedLeads(leads);
      if (leads.length > 0) {
        setSelectedLeadId(leads[0].id);
        setConvertCity(leads[0].city || '');
        setConvertState(leads[0].state || 'Gujarat');
        setConvertAddress(leads[0].address || '');
        setConvertPincode(leads[0].pincode || '');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingApprovedLeads(false);
    }
  };

  const handleLeadSelectChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const chosen = approvedLeads.find((l) => l.id === leadId);
    if (chosen) {
      setConvertCity(chosen.city || '');
      setConvertState(chosen.state || 'Gujarat');
      setConvertAddress(chosen.address || '');
      setConvertPincode(chosen.pincode || '');
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      setIsConverting(true);
      setError(null);
      const res = await apiClient.post(`/customers/convert/${selectedLeadId}`, {
        deliveryAddress: convertAddress || undefined,
        city: convertCity || undefined,
        state: convertState || undefined,
        pincode: convertPincode || undefined,
        clinicalNotes: convertNotes || undefined,
      });

      setSuccessMsg(`Approved lead converted to customer: ${res.data?.customerCode || 'Success'}`);
      setIsConvertModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDirectCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingDirect(true);
      setError(null);
      const res = await apiClient.post('/customers', {
        fullName: directName.trim(),
        phoneNumber: directPhone.trim(),
        email: directEmail.trim() || undefined,
        deliveryAddress: directAddress.trim() || undefined,
        city: directCity.trim() || undefined,
        state: directState.trim() || undefined,
        pincode: directPincode.trim() || undefined,
        clinicalNotes: directNotes.trim() || undefined,
      });

      setSuccessMsg(`Customer profile created: ${res.data?.customerCode || 'Success'}`);
      setIsDirectModalOpen(false);
      setDirectName('');
      setDirectPhone('');
      setDirectEmail('');
      setDirectAddress('');
      setDirectCity('');
      setDirectPincode('');
      setDirectNotes('');
      fetchCustomers();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreatingDirect(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'customerCode',
      header: 'Customer Code',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.customerCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Customer Name',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900">{item.fullName}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{item.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (item) => (
        <div className="text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-400" />
            <span>{[item.city, item.state].filter(Boolean).join(', ') || 'N/A'}</span>
          </div>
          {item.pincode && <span className="font-mono text-[10px] text-slate-400">PIN: {item.pincode}</span>}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Origin',
      render: (item) => (
        <Badge variant={item.originalLeadId ? 'success' : 'slate'}>
          {item.originalLeadId ? 'Converted Lead' : 'Walk-In'}
        </Badge>
      ),
    },
    {
      key: 'ordersCount',
      header: 'Lifetime Orders',
      render: (item) => (
        <span className="font-mono font-bold text-slate-800 text-xs">
          {item._count?.orders ?? item.orders?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Onboarded',
      render: (item) => (
        <span className="text-xs text-slate-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
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
          onClick={() => openCustomerDetail(item.id)}
          icon={<Eye className="h-3 w-3" />}
        >
          Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-forest-800 uppercase tracking-widest">
              MEL-MGT-001
            </span>
            <Badge variant="role">Customer CRM</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Customer Profiles & Conversion Engine
          </h2>
          <p className="text-xs text-slate-500">
            Convert approved customer leads into permanent customer records with lifetime order & product history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomers}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDirectModalOpen(true)}
            icon={<UserPlus className="h-3.5 w-3.5" />}
          >
            New Walk-In Customer
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openConvertModal}
            icon={<FileCheck className="h-3.5 w-3.5" />}
          >
            Convert Approved Lead
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Verified Customer Base"
          value={metrics?.totalCustomers ?? 0}
          subtitle="Permanent customer records"
          icon={Users}
          colorTheme="forest"
        />

        <StatCard
          title="Converted From Leads"
          value={metrics?.convertedFromLeads ?? 0}
          subtitle="Signed off by medical authority"
          icon={FileCheck}
          colorTheme="emerald"
        />

        <StatCard
          title="New This Month"
          value={metrics?.newThisMonth ?? 0}
          subtitle="Monthly customer acquisition"
          icon={UserPlus}
          colorTheme="blue"
        />
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by customer name, phone, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Customers DataTable */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage="No customer profiles found."
      />

      {/* Customer Profile & Order History Drawer */}
      <Drawer
        isOpen={!!selectedCustomerId}
        onClose={() => {
          setSelectedCustomerId(null);
          setCustomerDetail(null);
        }}
        title="Comprehensive Customer CRM Dossier"
        width="lg"
      >
        {loadingDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading customer profile...</div>
        ) : !customerDetail ? (
          <div className="py-16 text-center text-xs text-slate-400">Customer profile not found</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Header info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-forest-800 uppercase">
                    {customerDetail.customerCode}
                  </span>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {customerDetail.fullName}
                  </h4>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {customerDetail.phoneNumber}
                    </span>
                    {customerDetail.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {customerDetail.email}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={customerDetail.originalLeadId ? 'success' : 'slate'}>
                  {customerDetail.originalLeadId ? 'Converted Lead' : 'Walk-In'}
                </Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">Delivery Address:</span>
                <p>
                  {[
                    customerDetail.deliveryAddress,
                    customerDetail.city,
                    customerDetail.state,
                    customerDetail.pincode && `PIN: ${customerDetail.pincode}`,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'No address specified'}
                </p>
              </div>

              {customerDetail.clinicalNotes && (
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block mb-0.5">Clinical Notes:</span>
                  <p className="italic bg-white p-2 rounded border border-slate-200 text-[11px]">
                    &quot;{customerDetail.clinicalNotes}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Lifetime Orders History */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-forest-700" />
                Lifetime Formulation Orders ({customerDetail.orders?.length || 0})
              </h5>
              {!customerDetail.orders || customerDetail.orders.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 p-4 text-center text-slate-400">
                  No formulation orders placed yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerDetail.orders.map((ord: any) => (
                    <div key={ord.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <Badge variant={ord.status === 'DELIVERED' ? 'success' : 'warning'}>
                            {ord.status}
                          </Badge>
                          <span className="font-bold text-slate-900 block font-mono text-xs mt-0.5">
                            ₹{Number(ord.totalAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          {ord.items.map((it: any) => (
                            <div key={it.id} className="flex justify-between text-[11px] text-slate-600">
                              <span>
                                {it.product?.name || 'Ayurvedic Item'} × {it.quantity}
                              </span>
                              <span className="font-mono font-medium">₹{Number(it.totalPrice).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button inside Drawer */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
              >
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Convert Approved Lead Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Approved Lead to Customer"
        description="Select an approved product lead to establish their permanent customer profile."
        maxWidth="md"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
          {loadingApprovedLeads ? (
            <div className="py-6 text-center text-slate-400">Loading approved leads...</div>
          ) : approvedLeads.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">
              No APPROVED leads available for conversion. Ensure Panel 04 has executed sign-off.
            </div>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Approved Lead *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleLeadSelectChange(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                >
                  {approvedLeads.map((ld: any) => (
                    <option key={ld.id} value={ld.id}>
                      {ld.leadCode} - {ld.customerName} ({ld.phoneNumber}) - {ld.productInterest || 'Ayurveda'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={convertAddress}
                  onChange={(e) => setConvertAddress(e.target.value)}
                  placeholder="Street address, house/flat number, landmark"
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={convertCity}
                    onChange={(e) => setConvertCity(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    value={convertState}
                    required
                    onChange={(e) => setConvertState(e.target.value)}
                    placeholder="e.g. Gujarat"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={convertPincode}
                    onChange={(e) => setConvertPincode(e.target.value)}
                    placeholder="6 digits"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product & Regimen Notes</label>
                <input
                  type="text"
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  placeholder="Ayurvedic medicine remarks, customer preferences..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConvertModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isConverting}>
                  Convert & Create Customer
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Direct Walk-In Customer Modal */}
      <Modal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        title="Direct Walk-In Customer Onboarding"
        description="Register a direct customer who purchased outside tele-sales leads."
        maxWidth="md"
      >
        <form onSubmit={handleDirectCustomerSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={directName}
                onChange={(e) => setDirectName(e.target.value)}
                placeholder="e.g. Ramesh Bhai Patel"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={directPhone}
                onChange={(e) => setDirectPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
            <textarea
              rows={2}
              value={directAddress}
              onChange={(e) => setDirectAddress(e.target.value)}
              placeholder="Address"
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={directCity}
                onChange={(e) => setDirectCity(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={directState}
                onChange={(e) => setDirectState(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={directPincode}
                onChange={(e) => setDirectPincode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDirectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isCreatingDirect}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
