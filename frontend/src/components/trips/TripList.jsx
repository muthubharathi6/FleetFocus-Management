import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import tripService from '../../services/tripService';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';
import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import Modal from '../common/Modal';
import Drawer from '../common/Drawer';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks';
import {
  AnalyticsIcon,
  CheckCircleIcon,
  PlusIcon,
  RefreshIcon,
  RouteIcon,
  TruckIcon,
} from '../common/Icons';
import TripForm from './TripForm';

function formatDateTime(date) {
  if (!date) return 'Not Available';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Not Available';
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startTime, endTime, status) {
  if (!startTime) return 'Not Available';
  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return 'Not Available';

  if (endTime) {
    const end = new Date(endTime).getTime();
    if (Number.isNaN(end) || end < start) return 'Not Available';
    const diffMins = Math.round((end - start) / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (String(status || '').toUpperCase() === 'ACTIVE') {
    const elapsedHours = Math.max(0, Math.floor((Date.now() - start) / 3600000));
    if (elapsedHours < 24) return `In progress (${elapsedHours}h)`;
    return `In progress (${Math.floor(elapsedHours / 24)}d)`;
  }

  return 'Not Available';
}

function getStatusBadge(status) {
  switch (String(status || '').toUpperCase()) {
    case 'ACTIVE':
      return { className: 'ff-badge ff-badge-info', label: 'ACTIVE' };
    case 'COMPLETED':
      return { className: 'ff-badge ff-badge-success', label: 'COMPLETED' };
    case 'CANCELLED':
      return { className: 'ff-badge ff-badge-danger', label: 'CANCELLED' };
    default:
      return { className: 'ff-badge ff-badge-neutral', label: status || 'UNKNOWN' };
  }
}

export default function TripList() {
  const user = useSelector((state) => state.auth?.user);
  const notify = useNotifications();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(null);
  const [distanceInput, setDistanceInput] = useState('');
  const [endingLoading, setEndingLoading] = useState(false);
  const [endError, setEndError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const role = resolveUserRole(user);
  const permissions = getPermissions(role);
  const canDispatch = permissions.canDispatchTrips;

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await tripService.getAll();
      const data = res?.data;
      if (Array.isArray(data)) {
        setTrips(data);
      } else if (Array.isArray(data?.content)) {
        setTrips(data.content);
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.error('Failed to load trips:', err);
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
      }
      setError(
        err?.response?.data?.message || 'Unable to load trip records.'
      );
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const openEndTripModal = (trip) => {
    setSelectedTrip(null);
    setCompletingTrip(trip);
    setDistanceInput(
      trip?.distanceCovered !== null && trip?.distanceCovered !== undefined
        ? String(trip.distanceCovered)
        : ''
    );
    setEndError('');
  };

  const handleConfirmEndTrip = async (event) => {
    event.preventDefault();
    if (!completingTrip) return;

    const parsed = parseFloat(distanceInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      setEndError('Please enter a valid non-negative distance in km.');
      return;
    }

    setEndingLoading(true);
    setEndError('');
    try {
      await tripService.end(completingTrip.id, parsed);
      setCompletingTrip(null);
      setDistanceInput('');
      if (typeof notify === 'function') {
        notify(`Trip TRP-${completingTrip.id} completed (${parsed.toFixed(1)} km).`, 'success');
      }
      await fetchTrips();
    } catch (err) {
      console.error('Error ending trip:', err);
      setEndError(
        err?.response?.data?.message || 'Error ending trip. Please try again.'
      );
    } finally {
      setEndingLoading(false);
    }
  };

  const activeTrips = trips.filter((t) => String(t?.status).toUpperCase() === 'ACTIVE').length;
  const completedTrips = trips.filter((t) => String(t?.status).toUpperCase() === 'COMPLETED').length;
  const cancelledTrips = trips.filter((t) => String(t?.status).toUpperCase() === 'CANCELLED').length;
  const totalDistance = trips.reduce(
    (sum, trip) => sum + (Number(trip?.distanceCovered) || 0),
    0
  );

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = trips.filter((trip) => {
      const st = String(trip?.status || '').toUpperCase();
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        `trp-${trip.id}`.includes(q) ||
        String(trip?.vehicle?.licensePlate || '').toLowerCase().includes(q) ||
        String(trip?.vehicle?.model || '').toLowerCase().includes(q) ||
        String(trip?.driver?.user?.username || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'distance_desc') {
        return (Number(b?.distanceCovered) || 0) - (Number(a?.distanceCovered) || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a?.startTime || 0) - new Date(b?.startTime || 0);
      }
      return new Date(b?.startTime || 0) - new Date(a?.startTime || 0);
    });
  }, [trips, searchQuery, statusFilter, sortBy]);

  const filterPills = [
    { value: 'ALL', label: 'All', count: trips.length },
    { value: 'ACTIVE', label: 'Active', count: activeTrips },
    { value: 'COMPLETED', label: 'Completed', count: completedTrips },
    ...(cancelledTrips > 0 ? [{ value: 'CANCELLED', label: 'Cancelled', count: cancelledTrips }] : []),
  ];

  return (
    <main className="ff-page trips-page">
      <PageHeader
        eyebrow="FLEET OPERATIONS"
        title="Fleet Trips"
        subtitle={
          role === 'DRIVER'
            ? 'Review your assigned trip history, active journeys, and logged distances.'
            : 'Dispatch available vehicles and drivers, track active journeys, and record completed distances.'
        }
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={fetchTrips}
              disabled={loading}
            >
              <RefreshIcon size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canDispatch ? (
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                onClick={() => setShowDispatchModal(true)}
              >
                <PlusIcon size={16} />
                <span>Dispatch Vehicle</span>
              </button>
            ) : null}
          </>
        }
      />

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Trip metrics">
        <KpiCard
          label="Total Trips"
          value={trips.length}
          caption="Recorded journeys"
          icon={<RouteIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label="Active Trips"
          value={activeTrips}
          caption="Currently open"
          icon={<TruckIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label="Completed"
          value={completedTrips}
          caption="Closed with distance"
          icon={<CheckCircleIcon size={20} />}
          tone="emerald"
        />
        <KpiCard
          label="Distance Covered"
          value={`${totalDistance.toFixed(1)} km`}
          caption="Cumulative logged distance"
          icon={<AnalyticsIcon size={20} />}
          tone="amber"
        />
      </section>

      {error ? (
        <div className="ff-inline-alert is-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => setError('')}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <RouteIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Trip Records</h2>
              <p className="ff-card-subtitle ff-tabular">
                {filteredTrips.length} of {trips.length} trip{' '}
                {trips.length === 1 ? 'record' : 'records'} displayed
              </p>
            </div>
          </div>
        </div>

        <DataTableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search trip ID, vehicle, or driver..."
          filters={filterPills}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'newest', label: 'Sort: Newest First' },
            { value: 'oldest', label: 'Sort: Oldest First' },
            { value: 'distance_desc', label: 'Sort: Distance (High → Low)' },
          ]}
        />

        {loading && trips.length === 0 ? (
          <LoadingState
            title="Loading trip records..."
            description="Fetching dispatch and journey history from backend."
          />
        ) : error && trips.length === 0 ? (
          <ErrorState
            title="Unable to load trips"
            description={error}
            onRetry={fetchTrips}
          />
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<RouteIcon size={22} />}
            title="No Trips Found"
            description="No trip records are available in the database yet."
            action={
              canDispatch ? (
                <button
                  type="button"
                  className="ff-btn ff-btn-primary ff-btn-sm"
                  onClick={() => setShowDispatchModal(true)}
                >
                  Dispatch First Vehicle
                </button>
              ) : null
            }
          />
        ) : filteredTrips.length === 0 ? (
          <EmptyState
            icon={<RouteIcon size={22} />}
            title="No matching trips"
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
                  <th>Trip ID</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => {
                  const badge = getStatusBadge(trip.status);
                  const isActive = String(trip?.status || '').toUpperCase() === 'ACTIVE';

                  return (
                    <tr key={trip.id}>
                      <td className="ff-mono" style={{ fontWeight: 700 }}>
                        TRP-{trip.id}
                      </td>

                      <td>
                        <div className="ff-cell-primary">
                          <span className="ff-cell-icon">
                            <TruckIcon size={15} />
                          </span>
                          <div className="ff-cell-stack">
                            <span className="ff-cell-title">
                              {trip.vehicle?.licensePlate || 'Unknown'}
                            </span>
                            <span className="ff-cell-sub">
                              {trip.vehicle?.model || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="ff-avatar"
                            style={{ width: 26, height: 26, fontSize: 11, borderRadius: 7 }}
                          >
                            {(trip.driver?.user?.username || 'U').charAt(0).toUpperCase()}
                          </span>
                          <span>{trip.driver?.user?.username || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="ff-tabular" style={{ fontSize: 12.5, color: 'var(--ff-text-secondary)' }}>
                        {formatDateTime(trip.startTime)}
                      </td>

                      <td className="ff-tabular" style={{ fontSize: 12.5, color: 'var(--ff-text-secondary)' }}>
                        {formatDuration(trip.startTime, trip.endTime, trip.status)}
                      </td>

                      <td>
                        <span className={badge.className}>
                          <span className="ff-badge-dot" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="ff-tabular" style={{ fontWeight: 700 }}>
                        {Number(trip.distanceCovered || 0).toFixed(1)} km
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="ff-row-actions">
                          <button
                            type="button"
                            className="ff-btn ff-btn-ghost ff-btn-sm"
                            onClick={() => setSelectedTrip(trip)}
                          >
                            Details
                          </button>

                          {isActive ? (
                            <button
                              type="button"
                              className="ff-btn ff-btn-primary ff-btn-sm"
                              onClick={() => openEndTripModal(trip)}
                            >
                              End Trip
                            </button>
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

      {/* Dispatch Vehicle Modal */}
      <Modal
        open={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        size="md"
      >
        <TripForm
          onRefresh={async () => {
            if (typeof notify === 'function') {
              notify('Vehicle dispatched successfully.', 'success');
            }
            await fetchTrips();
          }}
          onClose={() => setShowDispatchModal(false)}
        />
      </Modal>

      {/* Complete Trip Modal (replaces browser window.prompt) */}
      <Modal
        open={Boolean(completingTrip)}
        onClose={endingLoading ? undefined : () => setCompletingTrip(null)}
        eyebrow="COMPLETE TRIP"
        title={completingTrip ? `End Trip TRP-${completingTrip.id}` : 'End Trip'}
        subtitle="Record the total distance covered to close this trip and update vehicle odometer."
        size="sm"
      >
        {completingTrip ? (
          <form className="ff-form" onSubmit={handleConfirmEndTrip}>
            {endError ? (
              <div className="ff-inline-alert is-error" role="alert" style={{ marginBottom: 0 }}>
                <span>{endError}</span>
              </div>
            ) : null}

            <div className="ff-summary-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ff-text-muted)' }}>Vehicle</span>
                <strong>
                  {completingTrip.vehicle?.licensePlate || 'Unknown'}
                  {completingTrip.vehicle?.model ? ` (${completingTrip.vehicle.model})` : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ff-text-muted)' }}>Driver</span>
                <strong>{completingTrip.driver?.user?.username || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ff-text-muted)' }}>Started</span>
                <span className="ff-tabular">{formatDateTime(completingTrip.startTime)}</span>
              </div>
            </div>

            <div className="ff-field">
              <label htmlFor="end-trip-distance">
                Distance Covered (km)<span className="ff-required">*</span>
              </label>
              <input
                id="end-trip-distance"
                type="number"
                className="ff-input ff-tabular"
                min="0"
                step="0.1"
                placeholder="Enter distance in km (e.g. 125.5)"
                value={distanceInput}
                onChange={(e) => {
                  setDistanceInput(e.target.value);
                  setEndError('');
                }}
                disabled={endingLoading}
                autoFocus
                required
              />
            </div>

            <div className="ff-form-actions">
              <button
                type="button"
                className="ff-btn ff-btn-secondary"
                onClick={() => setCompletingTrip(null)}
                disabled={endingLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ff-btn ff-btn-primary"
                disabled={endingLoading}
              >
                {endingLoading ? 'Completing...' : 'Complete Trip'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Trip Detail Drawer */}
      <Drawer
        open={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        eyebrow="JOURNEY RECORD"
        title={selectedTrip ? `Trip TRP-${selectedTrip.id}` : 'Trip Details'}
        subtitle={
          selectedTrip?.vehicle?.licensePlate
            ? `${selectedTrip.vehicle.licensePlate} · ${selectedTrip.vehicle.model || 'Fleet Vehicle'}`
            : 'Trip metadata'
        }
        footer={
          selectedTrip && String(selectedTrip.status).toUpperCase() === 'ACTIVE' ? (
            <button
              type="button"
              className="ff-btn ff-btn-primary ff-btn-sm"
              onClick={() => openEndTripModal(selectedTrip)}
            >
              End Trip
            </button>
          ) : null
        }
      >
        {selectedTrip ? (
          <div className="ff-detail-grid">
            <div className="ff-detail-item">
              <span className="ff-detail-label">Trip ID</span>
              <span className="ff-detail-value ff-mono">TRP-{selectedTrip.id}</span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Status</span>
              <span className="ff-detail-value">
                <span className={getStatusBadge(selectedTrip.status).className}>
                  <span className="ff-badge-dot" />
                  {selectedTrip.status || 'UNKNOWN'}
                </span>
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Vehicle</span>
              <span className="ff-detail-value">
                {selectedTrip.vehicle?.licensePlate || 'Unknown'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Driver</span>
              <span className="ff-detail-value">
                {selectedTrip.driver?.user?.username || 'Unassigned'}
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">Start Time</span>
              <span className="ff-detail-value ff-tabular">
                {formatDateTime(selectedTrip.startTime)}
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">End Time</span>
              <span className="ff-detail-value ff-tabular">
                {selectedTrip.endTime
                  ? formatDateTime(selectedTrip.endTime)
                  : String(selectedTrip.status).toUpperCase() === 'ACTIVE'
                    ? 'In Progress (Active)'
                    : 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Duration</span>
              <span className="ff-detail-value ff-tabular">
                {formatDuration(selectedTrip.startTime, selectedTrip.endTime, selectedTrip.status)}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Distance Covered</span>
              <span className="ff-detail-value ff-tabular">
                {Number(selectedTrip.distanceCovered || 0).toFixed(1)} km
              </span>
            </div>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
