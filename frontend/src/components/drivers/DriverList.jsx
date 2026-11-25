import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import driverService from '../../services/driverService';
import tripService from '../../services/tripService';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';
import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import Drawer from '../common/Drawer';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  CheckCircleIcon,
  DriversIcon,
  PlusIcon,
  RefreshIcon,
  RouteIcon,
  ShieldIcon,
} from '../common/Icons';
import DriverForm from './DriverForm';

function getStatusBadge(status) {
  switch (String(status || '').toUpperCase()) {
    case 'AVAILABLE':
      return { className: 'ff-badge ff-badge-success', label: 'AVAILABLE' };
    case 'ON_TRIP':
      return { className: 'ff-badge ff-badge-info', label: 'ON_TRIP' };
    case 'OFF_DUTY':
      return { className: 'ff-badge ff-badge-neutral', label: 'OFF_DUTY' };
    default:
      return { className: 'ff-badge ff-badge-neutral', label: status || 'UNKNOWN' };
  }
}

export default function DriverList() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth?.user);
  const notify = useNotifications();

  const role = resolveUserRole(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);
  const canViewDrivers = permissions.canViewDrivers;
  const canManageDrivers = permissions.canManageDrivers;

  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(canViewDrivers);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [deletingDriver, setDeletingDriver] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');

  const fetchData = useCallback(async () => {
    if (!canViewDrivers) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [dRes, tRes] = await Promise.allSettled([
        driverService.getAll(),
        tripService.getAll(),
      ]);

      if (dRes.status === 'fulfilled') {
        const list = Array.isArray(dRes.value?.data) ? dRes.value.data : [];
        setDrivers(list);
      } else {
        throw dRes.reason;
      }

      if (tRes.status === 'fulfilled') {
        const tData = tRes.value?.data;
        setTrips(
          Array.isArray(tData)
            ? tData
            : Array.isArray(tData?.content)
              ? tData.content
              : []
        );
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.error('Failed to load drivers:', err);
      setError(
        err?.response?.data?.message || 'Unable to load drivers from /api/drivers.'
      );
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [canViewDrivers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cross-reference real trip stats per driver
  const driverStatsMap = useMemo(() => {
    const map = new Map();
    trips.forEach((trip) => {
      const dId = trip?.driver?.id;
      if (dId === null || dId === undefined) return;
      const entry = map.get(dId) || {
        totalTrips: 0,
        activeTrips: 0,
        completedTrips: 0,
        totalDistance: 0,
        recentTrips: [],
      };
      entry.totalTrips += 1;
      const st = String(trip?.status || '').toUpperCase();
      if (st === 'ACTIVE') entry.activeTrips += 1;
      if (st === 'COMPLETED') entry.completedTrips += 1;
      entry.totalDistance += Number(trip?.distanceCovered) || 0;
      entry.recentTrips.push(trip);
      map.set(dId, entry);
    });
    return map;
  }, [trips]);

  const showBanner = (message, type = 'success') => {
    setNotice(message);
    if (typeof notify === 'function') {
      notify(message, type);
    }
    window.setTimeout(() => setNotice(''), 3500);
  };

  const handleFormSuccess = async (message) => {
    setShowForm(false);
    setEditingDriver(null);
    showBanner(message, 'success');
    await fetchData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingDriver) return;
    setDeleteLoading(true);
    try {
      await driverService.delete(deletingDriver.id);
      if (selectedDriver?.id === deletingDriver.id) {
        setSelectedDriver(null);
      }
      setDeletingDriver(null);
      showBanner('Driver deleted successfully.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Failed to delete driver:', err);
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Error deleting driver.';
      setError(msg);
      setDeletingDriver(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const availableCount = drivers.filter(
    (d) => String(d?.status).toUpperCase() === 'AVAILABLE'
  ).length;
  const onTripCount = drivers.filter(
    (d) => String(d?.status).toUpperCase() === 'ON_TRIP'
  ).length;
  const offDutyCount = drivers.filter(
    (d) => String(d?.status).toUpperCase() === 'OFF_DUTY'
  ).length;

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = drivers.filter((d) => {
      const st = String(d?.status || '').toUpperCase();
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        String(d?.user?.username || '').toLowerCase().includes(q) ||
        String(d?.user?.email || '').toLowerCase().includes(q) ||
        String(d?.licenseNumber || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'trips_desc') {
        const ta = driverStatsMap.get(a.id)?.totalTrips || 0;
        const tb = driverStatsMap.get(b.id)?.totalTrips || 0;
        return tb - ta;
      }
      if (sortBy === 'distance_desc') {
        const da = driverStatsMap.get(a.id)?.totalDistance || 0;
        const db = driverStatsMap.get(b.id)?.totalDistance || 0;
        return db - da;
      }
      if (sortBy === 'status') {
        return String(a?.status || '').localeCompare(String(b?.status || ''));
      }
      return String(a?.user?.username || '').localeCompare(
        String(b?.user?.username || '')
      );
    });
  }, [drivers, searchQuery, statusFilter, sortBy, driverStatsMap]);

  if (!canViewDrivers) {
    return (
      <main className="ff-page">
        <PageHeader
          eyebrow="FLEET RESOURCES"
          title="Driver Directory"
          subtitle="Manage driver profiles, license numbers, operational availability, and trip assignments."
        />
        <section className="ff-card">
          <UnavailableState
            title="Driver Directory Restricted"
            description="Viewing driver records (/api/drivers) is restricted to Fleet Manager, Dispatcher, and Admin roles."
            action={
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                onClick={() => navigate('/')}
              >
                Back to Dashboard
              </button>
            }
          />
        </section>
      </main>
    );
  }

  const selectedStats = selectedDriver ? driverStatsMap.get(selectedDriver.id) : null;

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="FLEET RESOURCES"
        title="Driver Directory"
        subtitle="Manage licensed fleet operators, monitor availability, and review real trip assignments."
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshIcon size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canManageDrivers ? (
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                onClick={() => {
                  setEditingDriver(null);
                  setShowForm(true);
                }}
              >
                <PlusIcon size={16} />
                <span>Add Driver</span>
              </button>
            ) : null}
          </>
        }
      />

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Driver KPIs">
        <KpiCard
          label="Total Drivers"
          value={drivers.length}
          caption="Registered license profiles"
          icon={<DriversIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label="Available"
          value={availableCount}
          caption="Ready for dispatch"
          icon={<CheckCircleIcon size={20} />}
          tone="emerald"
        />
        <KpiCard
          label="On Trip"
          value={onTripCount}
          caption="Currently assigned"
          icon={<RouteIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label="Off Duty"
          value={offDutyCount}
          caption="Unavailable for dispatch"
          icon={<ShieldIcon size={20} />}
          tone="purple"
        />
      </section>

      {notice ? (
        <div className="ff-inline-alert is-success" role="alert">
          <div className="ff-inline-alert-left">
            <CheckCircleIcon size={17} />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="ff-inline-alert is-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <DriversIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Registered Drivers</h2>
              <p className="ff-card-subtitle ff-tabular">
                {filteredDrivers.length} of {drivers.length}{' '}
                {drivers.length === 1 ? 'driver' : 'drivers'} displayed
              </p>
            </div>
          </div>
        </div>

        <DataTableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search driver name, email, or license..."
          filters={[
            { value: 'ALL', label: 'All', count: drivers.length },
            { value: 'AVAILABLE', label: 'Available', count: availableCount },
            { value: 'ON_TRIP', label: 'On Trip', count: onTripCount },
            { value: 'OFF_DUTY', label: 'Off Duty', count: offDutyCount },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name_asc', label: 'Sort: Name (A–Z)' },
            { value: 'trips_desc', label: 'Sort: Most Trips' },
            { value: 'distance_desc', label: 'Sort: Distance Logged' },
            { value: 'status', label: 'Sort: Status' },
          ]}
        />

        {loading && drivers.length === 0 ? (
          <LoadingState
            title="Loading drivers..."
            description="Fetching driver profiles from /api/drivers."
          />
        ) : error && drivers.length === 0 ? (
          <ErrorState
            title="Unable to load drivers"
            description={error}
            onRetry={fetchData}
          />
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<DriversIcon size={22} />}
            title="No Drivers Registered"
            description="No driver profiles exist in the database yet."
            action={
              canManageDrivers ? (
                <button
                  type="button"
                  className="ff-btn ff-btn-primary ff-btn-sm"
                  onClick={() => {
                    setEditingDriver(null);
                    setShowForm(true);
                  }}
                >
                  Create First Driver Profile
                </button>
              ) : null
            }
          />
        ) : filteredDrivers.length === 0 ? (
          <EmptyState
            icon={<DriversIcon size={22} />}
            title="No matching drivers"
            description="Try adjusting your search query or status filter."
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
                  <th>Driver</th>
                  <th>License Number</th>
                  <th>Status</th>
                  <th>Trips Logged</th>
                  <th>Distance Logged</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const badge = getStatusBadge(driver.status);
                  const stats = driverStatsMap.get(driver.id) || {
                    totalTrips: 0,
                    activeTrips: 0,
                    totalDistance: 0,
                  };
                  const username = driver?.user?.username || `Driver #${driver.id}`;

                  return (
                    <tr key={driver.id}>
                      <td>
                        <div className="ff-cell-primary">
                          <span className="ff-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                            {username.charAt(0).toUpperCase()}
                          </span>
                          <div className="ff-cell-stack">
                            <span className="ff-cell-title">{username}</span>
                            <span className="ff-cell-sub">
                              {driver?.user?.email || `Driver ID #${driver.id}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="ff-mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
                          {driver.licenseNumber || 'Not Available'}
                        </span>
                      </td>

                      <td>
                        <span className={badge.className}>
                          <span className="ff-badge-dot" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="ff-tabular">
                        <strong>{stats.totalTrips}</strong>
                        {stats.activeTrips > 0 ? (
                          <span style={{ marginLeft: 6, fontSize: 11.5, color: 'var(--ff-cyan-bright)' }}>
                            ({stats.activeTrips} active)
                          </span>
                        ) : null}
                      </td>

                      <td className="ff-tabular" style={{ fontWeight: 600 }}>
                        {stats.totalDistance.toFixed(1)} km
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="ff-row-actions">
                          <button
                            type="button"
                            className="ff-btn ff-btn-ghost ff-btn-sm"
                            onClick={() => setSelectedDriver(driver)}
                          >
                            Details
                          </button>
                          {canManageDrivers ? (
                            <>
                              <button
                                type="button"
                                className="ff-btn ff-btn-secondary ff-btn-sm"
                                onClick={() => {
                                  setSelectedDriver(null);
                                  setEditingDriver(driver);
                                  setShowForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ff-btn ff-btn-danger ff-btn-sm"
                                onClick={() => setDeletingDriver(driver)}
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
      </section>

      {/* Add / Edit Driver Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingDriver(null);
        }}
        size="md"
      >
        <DriverForm
          driver={editingDriver}
          existingDrivers={drivers}
          onSuccess={handleFormSuccess}
          onClose={() => {
            setShowForm(false);
            setEditingDriver(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingDriver)}
        title="Delete Driver Profile"
        message={`Are you sure you want to delete driver "${deletingDriver?.user?.username || `#${deletingDriver?.id}`}" (${deletingDriver?.licenseNumber || 'No license'})? Associated trip records linked to this driver will also be removed by the backend.`}
        confirmLabel="Delete Driver"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDriver(null)}
      />

      {/* Driver Detail Drawer */}
      <Drawer
        open={Boolean(selectedDriver)}
        onClose={() => setSelectedDriver(null)}
        eyebrow="DRIVER PROFILE"
        title={selectedDriver?.user?.username || 'Driver Details'}
        subtitle={selectedDriver?.user?.email || 'Licensed fleet operator'}
        footer={
          selectedDriver && canManageDrivers ? (
            <button
              type="button"
              className="ff-btn ff-btn-primary ff-btn-sm"
              onClick={() => {
                setEditingDriver(selectedDriver);
                setSelectedDriver(null);
                setShowForm(true);
              }}
            >
              Edit Driver
            </button>
          ) : null
        }
      >
        {selectedDriver ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="ff-detail-grid">
              <div className="ff-detail-item">
                <span className="ff-detail-label">Driver ID</span>
                <span className="ff-detail-value ff-tabular">#{selectedDriver.id}</span>
              </div>
              <div className="ff-detail-item">
                <span className="ff-detail-label">Status</span>
                <span className="ff-detail-value">
                  <span className={getStatusBadge(selectedDriver.status).className}>
                    <span className="ff-badge-dot" />
                    {selectedDriver.status}
                  </span>
                </span>
              </div>
              <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="ff-detail-label">License Number</span>
                <span className="ff-detail-value ff-mono">
                  {selectedDriver.licenseNumber || 'Not Available'}
                </span>
              </div>
              <div className="ff-detail-item">
                <span className="ff-detail-label">Total Trips</span>
                <span className="ff-detail-value ff-tabular">
                  {selectedStats?.totalTrips || 0}
                </span>
              </div>
              <div className="ff-detail-item">
                <span className="ff-detail-label">Logged Distance</span>
                <span className="ff-detail-value ff-tabular">
                  {(selectedStats?.totalDistance || 0).toFixed(1)} km
                </span>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: 'var(--ff-text-primary)' }}>
                Assigned Trip History
              </h3>
              {!selectedStats || selectedStats.recentTrips.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ff-text-muted)' }}>
                  No trips have been assigned to this driver yet.
                </p>
              ) : (
                <div className="ff-summary-box">
                  {selectedStats.recentTrips.slice(0, 6).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12.5,
                        paddingBottom: 6,
                        borderBottom: '1px solid var(--ff-border-subtle)',
                      }}
                    >
                      <span>
                        <strong className="ff-mono">TRP-{t.id}</strong> · {t.vehicle?.licensePlate || 'Unknown'}
                      </span>
                      <span className="ff-tabular" style={{ color: 'var(--ff-text-secondary)' }}>
                        {t.status} · {Number(t.distanceCovered || 0).toFixed(1)} km
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
