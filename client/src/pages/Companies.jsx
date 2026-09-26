import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Mail,
  MapPin,
  Users,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useRiders } from '../context/RiderContext';
import { calculateCompanyStats, formatCurrency, formatNumber } from '../utils/calculations';
import {
  PageHeader,
  Card,
  DataTable,
  Button,
  IconButton,
  Badge,
  ProtectedAction,
  Modal,
  ConfirmationModal,
  Input,
  Select,
  Textarea,
} from '../components/common';

export const Companies = () => {
  const navigate = useNavigate();
  const { companies, addCompany, updateCompany, deleteCompany, bulkDeleteCompanies, toggleCompanyStatus } = useCompany();
  const { riders } = useRiders();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Form State (Phone removed)
  const initialForm = {
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    address: '',
    status: 'Active',
    description: '',
    trackRiderDetails: true,
    sheetType: 'standard',
    riders: [{ riderId: '', riderName: '' }],
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Company name is required';
    if (!formData.code.trim()) errors.code = 'Company code is required';
    if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddRiderRow = () => {
    setFormData((prev) => ({
      ...prev,
      riders: [...(prev.riders || []), { riderId: '', riderName: '' }],
    }));
  };

  const handleRemoveRiderRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      riders: prev.riders.filter((_, idx) => idx !== index),
    }));
  };

  const handleRiderChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      riders: prev.riders.map((r, idx) => (idx === index ? { ...r, [field]: value } : r)),
    }));
  };

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      code: company.code || '',
      contactPerson: company.contactPerson || '',
      email: company.email || '',
      address: company.address || '',
      status: company.status || 'Active',
      description: company.description || '',
      trackRiderDetails: company.trackRiderDetails !== false,
      sheetType: company.sheetType || 'standard',
      riders: Array.isArray(company.riders) && company.riders.length > 0
        ? company.riders.map((r) => ({ riderId: r.riderId || '', riderName: r.riderName || '' }))
        : [{ riderId: '', riderName: '' }],
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (company) => {
    setSelectedCompany(company);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const cleanRiders = formData.trackRiderDetails && Array.isArray(formData.riders)
      ? formData.riders.filter((r) => r.riderId?.trim() || r.riderName?.trim())
      : [];
    const success = addCompany({ ...formData, riders: cleanRiders });
    if (success) setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const cleanRiders = formData.trackRiderDetails && Array.isArray(formData.riders)
      ? formData.riders.filter((r) => r.riderId?.trim() || r.riderName?.trim())
      : [];
    const success = updateCompany(selectedCompany.id, { ...formData, riders: cleanRiders });
    if (success) setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!selectedCompany) return;
    const success = deleteCompany(selectedCompany.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setSelectedCompany(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const success = await bulkDeleteCompanies(selectedRowIds);
    if (success) {
      setSelectedRowIds([]);
      setIsBulkDeleteModalOpen(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  const columns = [
    {
      key: 'name',
      label: 'Company Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E53935] flex items-center justify-center font-bold text-xs shrink-0">
            {val.charAt(0)}
          </div>
          <div>
            <div
              className="font-semibold text-gray-900 hover:text-[#E53935] cursor-pointer"
              onClick={() => navigate(`/companies/${row.id}`)}
            >
              {val}
            </div>
            <div className="text-[11px] text-gray-500 font-mono">Code: {row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      sortable: true,
      render: (val) => <span className="font-medium text-gray-800 text-xs">{val}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (val) => <span className="text-gray-600 text-xs">{val}</span>,
    },
    {
      key: 'ridersCount',
      label: 'Fleet Size',
      align: 'center',
      render: (_, row) => {
        const stats = calculateCompanyStats(row.id, riders);
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3 text-gray-500" />
            {stats.totalRiders}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: true,
      render: (val, row) => (
        <ProtectedAction actionName="change status">
          <Badge
            variant={val}
            dot
            onClick={() => toggleCompanyStatus(row.id)}
            className="cursor-pointer"
          >
            {val}
          </Badge>
        </ProtectedAction>
      ),
    },
    {
      key: 'createdDate',
      label: 'Onboarded',
      sortable: true,
      render: (val) => <span className="text-xs text-gray-500">{val}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Eye}
            size="sm"
            title="View company details & fleet"
            onClick={() => navigate(`/companies/${row.id}`)}
          />
          <ProtectedAction actionName="edit company">
            <IconButton
              icon={Edit2}
              size="sm"
              title="Edit company"
              onClick={() => handleOpenEdit(row)}
            />
          </ProtectedAction>
          <ProtectedAction actionName="delete company">
            <IconButton
              icon={Trash2}
              variant="danger"
              size="sm"
              title="Delete company"
              onClick={() => handleOpenDelete(row)}
            />
          </ProtectedAction>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Management"
        subtitle="Manage contracted fleet companies and allocations"
        actions={
          <ProtectedAction actionName="add a new company">
            <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
              Add Company
            </Button>
          </ProtectedAction>
        }
      />

      <Card padding="tight">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, code, contact..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#E53935] shadow-xs' : 'text-gray-600'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-[#E53935] shadow-xs' : 'text-gray-600'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </Card>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredCompanies.map((company) => {
            const stats = calculateCompanyStats(company.id, riders);
            return (
              <Card key={company.id} padding="normal" className="flex flex-col justify-between hover:border-gray-300">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E53935] flex items-center justify-center font-bold text-sm">
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{company.name}</h3>
                        <span className="text-[11px] font-mono text-gray-500">Code: {company.code}</span>
                      </div>
                    </div>
                    <Badge variant={company.status} size="sm">
                      {company.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {company.description || 'No company description registered.'}
                  </p>

                  <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{company.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{company.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{company.address || 'Address not listed'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center text-xs mb-4">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Riders</span>
                      <strong className="text-gray-900">{stats.totalRiders}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Deliveries</span>
                      <strong className="text-gray-900">{formatNumber(stats.totalDeliveries)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Payout</span>
                      <strong className="text-gray-900">{formatCurrency(stats.totalPayout)}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    View Fleet
                  </Button>
                  <ProtectedAction actionName="edit company">
                    <IconButton
                      icon={Edit2}
                      size="sm"
                      title="Edit"
                      onClick={() => handleOpenEdit(company)}
                    />
                  </ProtectedAction>
                  <ProtectedAction actionName="delete company">
                    <IconButton
                      icon={Trash2}
                      variant="danger"
                      size="sm"
                      title="Delete"
                      onClick={() => handleOpenDelete(company)}
                    />
                  </ProtectedAction>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCompanies}
          emptyTitle="No companies found"
          emptyDescription="Click Add Company to register a new logistics delivery partner."
          emptyActionLabel="+ Add Company"
          onEmptyAction={handleOpenAdd}
          enableSelection={true}
          selectedRowIds={selectedRowIds}
          onSelectRow={(id) => {
            setSelectedRowIds((prev) =>
              prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
            );
          }}
          onSelectAll={(newIds) => setSelectedRowIds(newIds)}
          onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
        />
      )}

      {/* ADD COMPANY MODAL (NO PHONE FIELD) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Fleet Company"
        confirmLabel="Create Company"
        onConfirm={handleAddSubmit}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. QuickExpress Logistics"
              error={formErrors.name}
              required
            />
            <Input
              label="Company Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. QEL-04"
              error={formErrors.code}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Representative"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Rajesh Sharma"
              error={formErrors.contactPerson}
              required
            />
            <Input
              label="Official Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ops@company.in"
              error={formErrors.email}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registered Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Office / Hub address"
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Excel Calculation / Sheet Format"
              value={formData.sheetType || 'standard'}
              onChange={(e) => setFormData({ ...formData, sheetType: e.target.value })}
              options={[
                { value: 'standard', label: 'Standard Format' },
                { value: 'xpressbees', label: 'XpressBees Format (Delivered + Pickup)' },
                { value: 'shadowfax', label: 'Shadowfax Format (Primary + Clubbed)' },
                { value: 'valmo', label: 'Valmo Format' },
              ]}
            />
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="companyTrackRiderAdd"
                checked={formData.trackRiderDetails !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    trackRiderDetails: checked,
                    riders: checked && (!formData.riders || formData.riders.length === 0)
                      ? [{ riderId: '', riderName: '' }]
                      : formData.riders,
                  });
                }}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="companyTrackRiderAdd" className="text-xs text-gray-700 cursor-pointer select-none">
                <span className="font-semibold block text-gray-900">Track Rider Name & ID</span>
                Enable to manage predefined riders & auto-fetch on Excel upload
              </label>
            </div>
          </div>

          {/* DYNAMIC RIDER BOXES IN ADD COMPANY MODAL */}
          {formData.trackRiderDetails && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Riders List ({formData.riders?.length || 0})</span>
                  <span className="text-[10px] text-gray-500 block">Add Rider ID & Rider Name pairs</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddRiderRow}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Add Rider Box</span>
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {formData.riders?.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="text-[11px] font-mono text-gray-400 w-5 text-center shrink-0">#{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Rider ID (e.g. 1018329)"
                      value={r.riderId}
                      onChange={(e) => handleRiderChange(idx, 'riderId', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none font-medium text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="Rider Name (e.g. Sachin Sahu)"
                      value={r.riderName}
                      onChange={(e) => handleRiderChange(idx, 'riderName', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none font-medium text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRiderRow(idx)}
                      disabled={formData.riders.length <= 1}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove Rider Box"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Description / Scope"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief scope of operation or SLA details..."
            rows={2}
          />
        </form>
      </Modal>

      {/* EDIT COMPANY MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Company"
        confirmLabel="Save Changes"
        onConfirm={handleEditSubmit}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              required
            />
            <Input
              label="Company Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Representative"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              error={formErrors.contactPerson}
              required
            />
            <Input
              label="Official Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Excel Calculation / Sheet Format"
              value={formData.sheetType || 'standard'}
              onChange={(e) => setFormData({ ...formData, sheetType: e.target.value })}
              options={[
                { value: 'standard', label: 'Standard Format' },
                { value: 'xpressbees', label: 'XpressBees Format (Delivered + Pickup)' },
                { value: 'shadowfax', label: 'Shadowfax Format (Primary + Clubbed)' },
                { value: 'valmo', label: 'Valmo Format' },
              ]}
            />
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="companyTrackRiderEdit"
                checked={formData.trackRiderDetails !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    trackRiderDetails: checked,
                    riders: checked && (!formData.riders || formData.riders.length === 0)
                      ? [{ riderId: '', riderName: '' }]
                      : formData.riders,
                  });
                }}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="companyTrackRiderEdit" className="text-xs text-gray-700 cursor-pointer select-none">
                <span className="font-semibold block text-gray-900">Track Rider Name & ID</span>
                Enable to manage predefined riders & auto-fetch on Excel upload
              </label>
            </div>
          </div>

          {/* DYNAMIC RIDER BOXES IN EDIT COMPANY MODAL */}
          {formData.trackRiderDetails && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Riders List ({formData.riders?.length || 0})</span>
                  <span className="text-[10px] text-gray-500 block">Add or edit Rider ID & Rider Name pairs</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddRiderRow}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Add Rider Box</span>
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {formData.riders?.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="text-[11px] font-mono text-gray-400 w-5 text-center shrink-0">#{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Rider ID (e.g. 1018329)"
                      value={r.riderId}
                      onChange={(e) => handleRiderChange(idx, 'riderId', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none font-medium text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="Rider Name (e.g. Sachin Sahu)"
                      value={r.riderName}
                      onChange={(e) => handleRiderChange(idx, 'riderName', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none font-medium text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRiderRow(idx)}
                      disabled={formData.riders.length <= 1}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove Rider Box"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.name}"?`}
        confirmLabel="Delete Company"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Companies"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected company records? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedRowIds.length} Companies`}
        variant="danger"
      />
    </div>
  );
};
