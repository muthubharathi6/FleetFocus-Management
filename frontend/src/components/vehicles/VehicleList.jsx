import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clearVehicleError,
  deleteVehicle,
  fetchVehicles,
} from '../../store/slices/vehicleSlice';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';
import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import Modal from '../common/Modal';
import Drawer from '../common/Drawer';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks';
import {
  CheckCircleIcon,
  PlusIcon,
  RefreshIcon,
  RouteIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';
import VehicleForm from './VehicleForm';

function getStatusBadge(status) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  switch (normalized) {
    case 'AVAILABLE':
      return { className: 'ff-badge ff-badge-success', label: 'AVAILABLE' };
    case 'ON_TRIP':
      return { className: 'ff-badge ff-badge-info', label: 'ON_TRIP' };
    case 'UNDER_MAINTENANCE':
      return { className: 'ff-badge ff-badge-warning', label: 'UNDER_MAINTENANCE' };
    default:
      return { className: 'ff-badge ff-badge-neutral', label: normalized };
  }
}

export default function VehicleList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notify = useNotifications();

  const authUser = useSelector((state) => state.auth?.user);
  const vehiclesState = useSelector((state) => state.vehicles || {});

  const items = useMemo(
    () => (Array.isArray(vehiclesState.items) ? vehiclesState.items : []),
    [vehiclesState.items]
  );
  const loading = Boolean(vehiclesState.loading);
  const error = vehiclesState.error || null;

  // Read pagination cleanly from vehicleSlice.pagination (fixes legacy destructuring bug)
  const pagination = vehiclesState.pagination || {};
  const totalPages = pagination.totalPages ?? vehiclesState.totalPages ?? 0;
  const currentPage = pagination.currentPage ?? vehiclesState.currentPage ?? 0;
  const totalElements = pagination.totalElements ?? items.length;

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [notification, setNotification] = useState('');
  const [page, setPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('plate_asc');

  const role = resolveUserRole(authUser);
  const permissions = getPermissions(role);
  const canManageVehicles = permissions.canManageVehicles;

  // Fetch vehicles on mount, page change, or role change (preserves T10 & T11)
  useEffect(() => {
    dispatch(fetchVehicles({ page, size: 10 }));
  }, [dispatch, page, authUser?.role]);

  const showNotification = (message, type = 'success') => {
    setNotification(message);
    if (typeof notify === 'function') {
      notify(message, type);
    }
    window.setTimeout(() => {
      setNotification('');
    }, 3500);
  };

  const handleRefresh = () => {
    dispatch(fetchVehicles({ page, size: 10 }));
  };

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(null);
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleDeleteVehicle = async (id) => {
    try {
      const result = await dispatch(deleteVehicle(id)).unwrap();
      const message =
        typeof result === 'string' && result.trim()
          ? result
          : 'Vehicle deleted successfully.';

      if (selectedVehicle?.id === id) {
        setSelectedVehicle(null);
      }

      showNotification(message, 'success');
      dispatch(fetchVehicles({ page, size: 10 }));
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        (typeof err === 'string' ? err : null);

      showNotification(
        typeof backendMessage === 'string'
          ? backendMessage
          : 'Error deleting vehicle.',
        'error'
      );
    }
  };

  const handleFormSuccess = (message) => {
    showNotification(message, 'success');
    setShowForm(false);
    setEditingVehicle(null);
    dispatch(fetchVehicles({ page, size: 10 }));
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingVehicle(null);
  };

  // Real statistics (fixed: no COMPLETED in On Trip, uses totalElements when paginated)
  const totalVehiclesCount = totalElements > 0 ? totalElements : items.length;
  const availableCount = items.filter(
    (v) => String(v?.status || '').toUpperCase() === 'AVAILABLE'
  ).length;
  const onTripCount = items.filter(
    (v) => String(v?.status || '').toUpperCase() === 'ON_TRIP'
  ).length;
  const underMaintenanceCount = items.filter(
    (v) => String(v?.status || '').toUpperCase() === 'UNDER_MAINTENANCE'
  ).length;
  const isPaginated = totalPages > 1;

  // Filter & sort displayed rows
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((v) => {
      const st = String(v?.status || '').toUpperCase();
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        String(v?.licensePlate || '').toLowerCase().includes(q) ||
        String(v?.model || '').toLowerCase().includes(q) ||
        String(v?.vin || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'mileage_desc') {
        return (Number(b?.currentMileage) || 0) - (Number(a?.currentMileage) || 0);
      }
      if (sortBy === 'mileage_asc') {
        return (Number(a?.currentMileage) || 0) - (Number(b?.currentMileage) || 0);
      }
      if (sortBy === 'status') {
        return String(a?.status || '').localeCompare(String(b?.status || ''));
      }
      return String(a?.licensePlate || '').localeCompare(String(b?.licensePlate || ''));
    });
  }, [items, searchQuery, statusFilter, sortBy]);

  const filterPills = [
    { value: 'ALL', label: 'All', count: items.length },
    { value: 'AVAILABLE', label: 'Available', count: availableCount },
    { value: 'ON_TRIP', label: 'On Trip', count: onTripCount },
    { value: 'UNDER_MAINTENANCE', label: 'Maintenance', count: underMaintenanceCount },
  ];

  return (
    <main className="ff-page vehicle-page">
      <PageHeader
        eyebrow="FLEET MANAGEMENT"
        title="Vehicle Inventory"
        subtitle="Manage registered vehicles, monitor operational availability, and inspect odometer mileage."
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshIcon size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canManageVehicles ? (
              <button
                type="button"
                className="ff-btn ff-btn-primary add-vehicle-button"
                onClick={handleAddVehicle}
              >
                <PlusIcon size={16} />
                <span>Add Vehicle</span>
              </button>
            ) : null}
          </>
        }
      />

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Vehicle statistics">
        <KpiCard
          label="Total Vehicles"
          value={totalVehiclesCount}
          caption={isPaginated ? `Showing ${items.length} on page ${currentPage + 1}` : 'Registered in fleet'}
          icon={<TruckIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label="Available"
          value={availableCount}
          caption={isPaginated ? 'On current page' : 'Ready for dispatch'}
          icon={<CheckCircleIcon size={20} />}
          tone="emerald"
        />
        <KpiCard
          label="On Trip"
          value={onTripCount}
          caption={isPaginated ? 'On current page' : 'Marked ON_TRIP'}
          icon={<RouteIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label="Under Maintenance"
          value={underMaintenanceCount}
          caption={isPaginated ? 'On current page' : 'In service workshop'}
          icon={<WrenchIcon size={20} />}
          tone="amber"
        />
      </section>

      {/* Inline Success Banner (preserves exact backend string visibility for T14/T15/T16) */}
      {notification ? (
        <div className="ff-inline-alert is-success vehicle-notification" role="alert">
          <div className="ff-inline-alert-left">
            <CheckCircleIcon size={17} />
            <span className="notification-message">{notification}</span>
          </div>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            aria-label="Dismiss notification"
            onClick={() => setNotification('')}
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Inline Error Banner (wired to clearVehicleError) */}
      {error ? (
        <div className="ff-inline-alert is-error vehicle-error" role="alert">
          <div className="ff-inline-alert-left">
            <span>{typeof error === 'string' ? error : 'Error loading vehicles.'}</span>
          </div>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            aria-label="Dismiss error"
            onClick={() => dispatch(clearVehicleError())}
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Main Vehicle Database Card */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <TruckIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Fleet Vehicles</h2>
              <p className="ff-card-subtitle ff-tabular">
                {filteredVehicles.length} of {items.length} loaded{' '}
                {items.length === 1 ? 'vehicle' : 'vehicles'} shown
                {isPaginated ? ` (${totalVehiclesCount} total across ${totalPages} pages)` : ''}
              </p>
            </div>
          </div>
        </div>

        <DataTableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search plate, model, or VIN..."
          filters={filterPills}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'plate_asc', label: 'Sort: License Plate (A–Z)' },
            { value: 'mileage_desc', label: 'Sort: Mileage (High → Low)' },
            { value: 'mileage_asc', label: 'Sort: Mileage (Low → High)' },
            { value: 'status', label: 'Sort: Status' },
          ]}
        />

        {loading && items.length === 0 ? (
          <LoadingState
            title="Loading vehicles..."
            description="Please wait while the fleet inventory is fetched from backend."
          />
        ) : error && items.length === 0 ? (
          <ErrorState
            title="Unable to load vehicles"
            description={typeof error === 'string' ? error : 'Failed to communicate with /api/vehicles.'}
            onRetry={handleRefresh}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TruckIcon size={22} />}
            title="No vehicles found"
            description="There are currently no vehicles registered in the fleet inventory."
          />
        ) : filteredVehicles.length === 0 ? (
          <EmptyState
            icon={<TruckIcon size={22} />}
            title="No matching vehicles"
            description="No vehicles match your current search query or status filter."
            action={
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="ff-table-wrap">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>License Plate</th>
                  <th>Model</th>
                  <th>VIN</th>
                  <th>Current Mileage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const badge = getStatusBadge(vehicle.status);
                  const mileage = Number(vehicle.currentMileage);

                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <div className="ff-cell-primary">
                          <span className="ff-cell-icon">
                            <TruckIcon size={16} />
                          </span>
                          <div className="ff-cell-stack">
                            <span className="ff-cell-title">
                              {vehicle.licensePlate || '—'}
                            </span>
                            <span className="ff-cell-sub">ID #{vehicle.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>{vehicle.model || '—'}</td>

                      <td>
                        <span className="ff-mono" style={{ fontSize: 12.5, color: 'var(--ff-text-secondary)' }}>
                          {vehicle.vin || '—'}
                        </span>
                      </td>

                      <td className="ff-tabular">
                        {Number.isFinite(mileage)
                          ? `${mileage.toLocaleString('en-IN')} km`
                          : 'Not Available'}
                      </td>

                      <td>
                        <span className={badge.className}>
                          <span className="ff-badge-dot" />
                          {badge.label}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="ff-row-actions">
                          <button
                            type="button"
                            className="ff-btn ff-btn-ghost ff-btn-sm"
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            Details
                          </button>

                          {canManageVehicles ? (
                            <>
                              <button
                                type="button"
                                className="ff-btn ff-btn-secondary ff-btn-sm"
                                onClick={() => handleEditVehicle(vehicle)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ff-btn ff-btn-danger ff-btn-sm"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Fixed Pagination Bar */}
        {totalPages > 1 ? (
          <div className="ff-pagination">
            <span className="ff-pagination-meta">
              Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong> ·{' '}
              {totalVehiclesCount} total vehicles
            </span>
            <div className="ff-pagination-controls">
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Add / Edit Vehicle Modal */}
      <Modal open={showForm} onClose={closeModal} size="md">
        <VehicleForm
          vehicle={editingVehicle}
          editMode={Boolean(editingVehicle)}
          vehicleId={editingVehicle?.id}
          onClose={closeModal}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* Vehicle Detail Slide-Over Drawer */}
      <Drawer
        open={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
        eyebrow="VEHICLE PROFILE"
        title={selectedVehicle?.licensePlate || 'Vehicle Details'}
        subtitle={selectedVehicle?.model || 'Registered fleet vehicle'}
        footer={
          selectedVehicle ? (
            <>
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                onClick={() => {
                  setSelectedVehicle(null);
                  navigate('/trips');
                }}
              >
                View Trips
              </button>
              {canManageVehicles ? (
                <button
                  type="button"
                  className="ff-btn ff-btn-primary ff-btn-sm"
                  onClick={() => handleEditVehicle(selectedVehicle)}
                >
                  Edit Vehicle
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {selectedVehicle ? (
          <div className="ff-detail-grid">
            <div className="ff-detail-item">
              <span className="ff-detail-label">Vehicle ID</span>
              <span className="ff-detail-value ff-tabular">#{selectedVehicle.id}</span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Operational Status</span>
              <span className="ff-detail-value">
                <span className={getStatusBadge(selectedVehicle.status).className}>
                  <span className="ff-badge-dot" />
                  {selectedVehicle.status || 'UNKNOWN'}
                </span>
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">VIN (Vehicle Identification Number)</span>
              <span className="ff-detail-value ff-mono">{selectedVehicle.vin || 'Not Available'}</span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">License Plate</span>
              <span className="ff-detail-value">{selectedVehicle.licensePlate || 'Not Available'}</span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Model</span>
              <span className="ff-detail-value">{selectedVehicle.model || 'Not Available'}</span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">Current Mileage</span>
              <span className="ff-detail-value ff-tabular">
                {Number.isFinite(Number(selectedVehicle.currentMileage))
                  ? `${Number(selectedVehicle.currentMileage).toLocaleString('en-IN')} km`
                  : 'Not Available'}
              </span>
            </div>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
