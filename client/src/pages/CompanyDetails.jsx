import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  PackageCheck,
  IndianRupee,
  TrendingDown,
  Coins,
  Wallet,
  Clock,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Mail,
  MapPin,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useRiders } from '../context/RiderContext';
import { calculateCompanyStats, formatCurrency, formatNumber } from '../utils/calculations';
import {
  PageHeader,
  StatCard,
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
} from '../components/common';

export const CompanyDetails = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { getCompanyById } = useCompany();
  const { riders, addRider, updateRider, deleteRider } = useRiders();

  const company = getCompanyById(companyId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Phone removed
  const initialFormState = {
    riderName: '',
    riderId: '',
    companyId: companyId,
    vehicleNumber: '',
    deliveredPickupTotal: '',
    primary: '',
    clubbed: '',
    rateCard: '14',
    payout: '',
    loss: '0',
    advance: '0',
    finalPayout: '',
    paymentStatus: 'Pending',
    status: 'Active',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  if (!company) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Company Not Found</h2>
        <p className="text-sm text-gray-500">The requested company profile does not exist.</p>
        <Button variant="primary" onClick={() => navigate('/companies')}>
          Back to Companies
        </Button>
      </div>
    );
  }

  const companyRiders = useMemo(() => {
    return riders.filter((r) => r.companyId === companyId);
  }, [riders, companyId]);

  const stats = calculateCompanyStats(companyId, riders);

  const filteredRiders = useMemo(() => {
    return companyRiders.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.riderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || r.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companyRiders, searchQuery, statusFilter]);

  const validateForm = () => {
    const errors = {};
    if (!formData.riderName.trim()) errors.riderName = 'Rider name is required';
    if (!formData.deliveredPickupTotal && formData.deliveredPickupTotal !== 0)
      errors.deliveredPickupTotal = 'Deliveries count is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setFormData({ ...initialFormState, companyId });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rider) => {
    setSelectedRider(rider);
    setFormData({
      riderName: rider.riderName || '',
      riderId: rider.riderId || '',
      companyId: rider.companyId || companyId,
      vehicleNumber: rider.vehicleNumber || '',
      deliveredPickupTotal: rider.deliveredPickupTotal || '',
      primary: rider.primary || '',
      clubbed: rider.clubbed || '',
      rateCard: rider.rateCard || '14',
      payout: rider.payout || '',
      loss: rider.loss || '0',
      advance: rider.advance || '0',
      finalPayout: rider.finalPayout || '',
      paymentStatus: rider.paymentStatus || 'Pending',
      status: rider.status || 'Active',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenView = (rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };

  const handleOpenDelete = (rider) => {
    setSelectedRider(rider);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const success = addRider({ ...formData, companyId });
    if (success) setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const success = updateRider(selectedRider.id, formData);
    if (success) setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!selectedRider) return;
    const success = deleteRider(selectedRider.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setSelectedRider(null);
    }
  };

  const columns = [
    {
      key: 'riderName',
      label: 'Rider Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-gray-900">{val}</div>
          <div className="text-[11px] text-gray-500">{row.vehicleNumber || 'No vehicle registered'}</div>
        </div>
      ),
    },
    {
      key: 'riderId',
      label: 'Rider ID',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{val}</span>,
    },
    {
      key: 'deliveredPickupTotal',
      label: 'Deliveries',
      sortable: true,
      align: 'center',
      render: (val) => <span className="font-bold text-gray-900">{val}</span>,
    },
    {
      key: 'payout',
      label: 'Payout',
      sortable: true,
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      key: 'loss',
      label: 'Loss',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={Number(val) > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
          {Number(val) > 0 ? `-₹${val}` : '₹0'}
        </span>
      ),
    },
    {
      key: 'finalPayout',
      label: 'Final Payout',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-bold text-[#E53935]">{formatCurrency(val)}</span>,
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      align: 'center',
      sortable: true,
      render: (val) => <Badge variant={val} dot>{val}</Badge>,
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
            title="View rider"
            onClick={() => handleOpenView(row)}
          />
          <ProtectedAction actionName="edit rider">
            <IconButton
              icon={Edit2}
              size="sm"
              title="Edit rider"
              onClick={() => handleOpenEdit(row)}
            />
          </ProtectedAction>
          <ProtectedAction actionName="delete rider">
            <IconButton
              icon={Trash2}
              variant="danger"
              size="sm"
              title="Delete rider"
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
        title={company.name}
        subtitle={`Fleet Code: ${company.code} • Established: ${company.createdDate}`}
        badge={<Badge variant={company.status} dot>{company.status}</Badge>}
        breadcrumbs={
          <>
            <button
              type="button"
              onClick={() => navigate('/companies')}
              className="text-gray-500 hover:text-gray-800"
            >
              Companies
            </button>
            <span>/</span>
            <span className="text-gray-800 font-medium">{company.name}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/companies')}
            >
              Back
            </Button>
            <ProtectedAction actionName="add rider to company">
              <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
                Add Rider
              </Button>
            </ProtectedAction>
          </div>
        }
      />

      {/* Company Profile (No Phone) */}
      <Card padding="normal" className="bg-linear-to-r from-white to-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-gray-400 block text-[11px] uppercase font-bold tracking-wider">
              Contact Representative
            </span>
            <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#E53935]" />
              {company.contactPerson}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-gray-400 block text-[11px] uppercase font-bold tracking-wider">
              Official Email
            </span>
            <div className="font-semibold text-gray-800 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-gray-400" />
              {company.email}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-gray-400 block text-[11px] uppercase font-bold tracking-wider">
              Registered Address & Hub
            </span>
            <div className="text-gray-700 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>{company.address || 'Address not registered'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 7 KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Riders"
          value={stats.totalRiders}
          description="Assigned fleet personnel"
          icon={Users}
        />
        <StatCard
          title="Total Deliveries"
          value={formatNumber(stats.totalDeliveries)}
          description="Completed parcels"
          icon={PackageCheck}
        />
        <StatCard
          title="Total Payout"
          value={formatCurrency(stats.totalPayout)}
          description="Gross earnings"
          icon={IndianRupee}
        />
        <StatCard
          title="Total Loss"
          value={formatCurrency(stats.totalLoss)}
          description="Damage & SLA fines"
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Total Advance"
          value={formatCurrency(stats.totalAdvance)}
          description="Disbursed fuel/cash"
          icon={Coins}
        />
        <StatCard
          title="Final Payout"
          value={formatCurrency(stats.finalPayout)}
          description="Net payable balance"
          icon={Wallet}
          iconColor="text-[#E53935]"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          description="Unsettled vouchers"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Company Riders Table */}
      <Card
        title={`${company.name} — Fleet Riders`}
        subtitle={`Showing ${filteredRiders.length} of ${companyRiders.length} active riders`}
        action={
          <ProtectedAction actionName="add rider">
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
              Add Rider
            </Button>
          </ProtectedAction>
        }
      >
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rider name, ID, bike..."
            />
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Hold', label: 'Hold' },
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRiders}
          emptyTitle="No riders found for this company"
          emptyDescription="Add riders to begin tracking delivery payouts and performance."
          emptyActionLabel="+ Add First Rider"
          onEmptyAction={handleOpenAdd}
        />
      </Card>

      {/* ADD RIDER MODAL (NO PHONE FIELD) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Rider — ${company.name}`}
        confirmLabel="Save Rider"
        onConfirm={handleAddSubmit}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rider Name"
              value={formData.riderName}
              onChange={(e) => setFormData({ ...formData, riderName: e.target.value })}
              placeholder="e.g. Anand Sharma"
              error={formErrors.riderName}
              required
            />
            <Input
              label="Rider ID"
              value={formData.riderId}
              onChange={(e) => setFormData({ ...formData, riderId: e.target.value })}
              placeholder="Auto-generated if blank"
            />
          </div>

          <Input
            label="Vehicle Registration No"
            value={formData.vehicleNumber}
            onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
            placeholder="e.g. MH 04 XY 1234"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Deliveries"
              type="number"
              value={formData.deliveredPickupTotal}
              onChange={(e) => setFormData({ ...formData, deliveredPickupTotal: e.target.value })}
              error={formErrors.deliveredPickupTotal}
              required
            />
            <Input
              label="Primary"
              type="number"
              value={formData.primary}
              onChange={(e) => setFormData({ ...formData, primary: e.target.value })}
            />
            <Input
              label="Clubbed"
              type="number"
              value={formData.clubbed}
              onChange={(e) => setFormData({ ...formData, clubbed: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Rate Card (₹)"
              type="number"
              value={formData.rateCard}
              onChange={(e) => setFormData({ ...formData, rateCard: e.target.value })}
            />
            <Input
              label="Loss (₹)"
              type="number"
              value={formData.loss}
              onChange={(e) => setFormData({ ...formData, loss: e.target.value })}
            />
            <Input
              label="Advance (₹)"
              type="number"
              value={formData.advance}
              onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
            />
          </div>

          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            options={[
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Hold', label: 'Hold' },
            ]}
          />
        </form>
      </Modal>

      {/* EDIT RIDER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Rider"
        confirmLabel="Update"
        onConfirm={handleEditSubmit}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Rider Name"
            value={formData.riderName}
            onChange={(e) => setFormData({ ...formData, riderName: e.target.value })}
            error={formErrors.riderName}
            required
          />
          <Input
            label="Vehicle No"
            value={formData.vehicleNumber}
            onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Deliveries"
              type="number"
              value={formData.deliveredPickupTotal}
              onChange={(e) => setFormData({ ...formData, deliveredPickupTotal: e.target.value })}
              required
            />
            <Input
              label="Rate Card (₹)"
              type="number"
              value={formData.rateCard}
              onChange={(e) => setFormData({ ...formData, rateCard: e.target.value })}
            />
            <Input
              label="Loss (₹)"
              type="number"
              value={formData.loss}
              onChange={(e) => setFormData({ ...formData, loss: e.target.value })}
            />
          </div>
          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            options={[
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Hold', label: 'Hold' },
            ]}
          />
        </form>
      </Modal>

      {/* VIEW RIDER MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Rider Details"
        subtitle={selectedRider?.riderName}
        cancelLabel="Close"
      >
        {selectedRider && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-900 text-sm">{selectedRider.riderName}</div>
                <div className="text-gray-500 font-mono">ID: {selectedRider.riderId}</div>
              </div>
              <Badge variant={selectedRider.paymentStatus} dot>{selectedRider.paymentStatus}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>Deliveries: <strong className="text-gray-800">{selectedRider.deliveredPickupTotal}</strong></div>
              <div>Rate: <strong className="text-gray-800">₹{selectedRider.rateCard}</strong></div>
              <div>Gross Payout: <strong className="text-gray-800">{formatCurrency(selectedRider.payout)}</strong></div>
              <div>Loss: <strong className="text-red-600">₹{selectedRider.loss}</strong></div>
              <div>Advance: <strong className="text-amber-700">₹{selectedRider.advance}</strong></div>
              <div>Final Net: <strong className="text-[#E53935] text-sm">{formatCurrency(selectedRider.finalPayout)}</strong></div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Remove Rider"
        message={`Are you sure you want to remove ${selectedRider?.riderName}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
