import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import monitoringService from '../../services/monitoringService';

import { usePreferences } from '../../context/PreferencesContext';
import { deriveOperationalAlerts } from '../../utils/alertDerivation';
import { formatRoleLabel, getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';

import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../common/StateBlocks';
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  RadarIcon,
  RefreshIcon,
  SettingsIcon,
  ShieldIcon,
} from '../common/Icons';

const ACK_STORAGE_KEY = 'fleetfocus_ack_alerts_v1';

function loadAcknowledgements() {
  try {
    const raw = localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveAcknowledgements(map) {
  try {
    localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function extractList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function canNavigateToRoute(route, permissions) {
  if (route === '/live') return permissions.canViewLiveFleet;
  if (route === '/maintenance') return permissions.canViewMaintenance;
  if (route === '/drivers') return permissions.canViewDrivers;
  return true;
}

export default function AlertsPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences } = usePreferences();
  const notify = useNotifications();
  const navigate = useNavigate();

  const role = resolveUserRole(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);

  const [state, setState] = useState({
    loading: true,
    vehicles: { items: [], status: 'loading', error: null },
    trips: { items: [], status: 'loading', error: null },
    liveFleet: {
      items: [],
      status: permissions.canViewLiveFleet ? 'loading' : 'restricted',
      error: null,
    },
  });

  const [ackMap, setAckMap] = useState(loadAcknowledgements);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSources = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      vehicles: { ...prev.vehicles, status: 'loading', error: null },
      trips: { ...prev.trips, status: 'loading', error: null },
      liveFleet: permissions.canViewLiveFleet
        ? { ...prev.liveFleet, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
    }));

    const [vRes, tRes, lRes] = await Promise.allSettled([
      vehicleService.getAll(0, 200),
      tripService.getAll(),
      permissions.canViewLiveFleet ? monitoringService.getLiveFleet() : Promise.resolve(null),
    ]);

    setState({
      loading: false,
      vehicles:
        vRes.status === 'fulfilled'
          ? { items: extractList(vRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: vRes.reason?.message || 'Unable to load vehicles.' },
      trips:
        tRes.status === 'fulfilled'
          ? { items: extractList(tRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: tRes.reason?.message || 'Unable to load trips.' },
      liveFleet: !permissions.canViewLiveFleet
        ? { items: [], status: 'restricted', error: null }
        : lRes.status === 'fulfilled'
          ? { items: extractList(lRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: lRes.reason?.message || 'Unable to load live telemetry.' },
    });
  }, [permissions]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const gpsActiveCount = useMemo(
    () =>
      state.liveFleet.items.filter(
        (v) =>
          v?.latitude !== null &&
          v?.latitude !== undefined &&
          v?.longitude !== null &&
          v?.longitude !== undefined
      ).length,
    [state.liveFleet.items]
  );

  // Derive alerts strictly from real backend data + active threshold preferences
  const derivedAlerts = useMemo(() => {
    const base = deriveOperationalAlerts({
      vehicles: state.vehicles.items,
      trips: state.trips.items,
      liveFleet: state.liveFleet.items,
      thresholds: preferences,
    });

    // Honest GPS offline operational signal when telemetry endpoint is permitted and 0 GPS coordinates exist
    if (
      state.liveFleet.status === 'ready' &&
      state.liveFleet.items.length > 0 &&
      gpsActiveCount === 0
    ) {
      base.push({
        id: 'telemetry-gps-offline',
        severity: 'info',
        category: 'Telemetry',
        title: 'GPS Telemetry Offline Across Fleet',
        description: `0 of ${state.liveFleet.items.length} monitored vehicles currently report live GPS coordinates from /api/monitoring/live.`,
        meta: 'Signal status',
        route: '/live',
      });
    }

    return base;
  }, [state.vehicles.items, state.trips.items, state.liveFleet.items, state.liveFleet.status, gpsActiveCount, preferences]);

  const categories = useMemo(() => {
    const set = new Set(derivedAlerts.map((a) => a.category).filter(Boolean));
    return Array.from(set).sort();
  }, [derivedAlerts]);

  const enrichedAlerts = useMemo(
    () =>
      derivedAlerts.map((alert) => ({
        ...alert,
        acknowledgedAt: ackMap[alert.id] || null,
        isAcknowledged: Boolean(ackMap[alert.id]),
      })),
    [derivedAlerts, ackMap]
  );

  const counts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    let acknowledged = 0;
    let unacknowledged = 0;
    enrichedAlerts.forEach((a) => {
      if (a.severity === 'critical') critical += 1;
      else if (a.severity === 'warning') warning += 1;
      else info += 1;
      if (a.isAcknowledged) acknowledged += 1;
      else unacknowledged += 1;
    });
    return {
      total: enrichedAlerts.length,
      critical,
      warning,
      info,
      acknowledged,
      unacknowledged,
    };
  }, [enrichedAlerts]);

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedAlerts.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (statusFilter === 'UNACK' && a.isAcknowledged) return false;
      if (statusFilter === 'ACK' && !a.isAcknowledged) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        String(a.meta || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedAlerts, severityFilter, statusFilter, categoryFilter, searchQuery]);

  const toggleAck = (alertId, alertTitle) => {
    const wasAcked = Boolean(ackMap[alertId]);
    const next = { ...ackMap };
    if (wasAcked) {
      delete next[alertId];
    } else {
      next[alertId] = new Date().toISOString();
    }
    setAckMap(next);
    saveAcknowledgements(next);
    if (typeof notify === 'function') {
      notify(
        wasAcked ? `Restored alert: ${alertTitle}` : `Acknowledged locally: ${alertTitle}`,
        wasAcked ? 'info' : 'success'
      );
    }
  };

  const handleAckAllVisible = () => {
    const unackedVisible = filteredAlerts.filter((a) => !a.isAcknowledged);
    if (unackedVisible.length === 0) return;
    const now = new Date().toISOString();
    const next = { ...ackMap };
    unackedVisible.forEach((a) => {
      next[a.id] = now;
    });
    setAckMap(next);
    saveAcknowledgements(next);
    if (typeof notify === 'function') {
      notify(`Acknowledged ${unackedVisible.length} visible alert(s) in browser storage.`, 'success');
    }
  };

  const handleResetAcks = () => {
    setAckMap({});
    saveAcknowledgements({});
    if (typeof notify === 'function') {
      notify('Cleared all local alert acknowledgements.', 'info');
    }
  };

  const allSourcesFailed =
    state.vehicles.status === 'error' &&
    state.trips.status === 'error' &&
    (state.liveFleet.status === 'error' || state.liveFleet.status === 'restricted');

  const unackedVisibleCount = filteredAlerts.filter((a) => !a.isAcknowledged).length;

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="CONTROL CENTER · MONITORING"
        title="Alerts Center"
        subtitle="Operational alerts derived live from permitted backend vehicle, trip, and telemetry APIs."
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon size={15} />
              <span>Thresholds</span>
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={loadSources}
              disabled={state.loading}
            >
              <RefreshIcon size={15} />
              <span>{state.loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-primary"
              onClick={handleAckAllVisible}
              disabled={unackedVisibleCount === 0}
            >
              <CheckCircleIcon size={15} />
              <span>Acknowledge Visible ({unackedVisibleCount})</span>
            </button>
          </>
        }
      />

      {/* Explicit Local-Persistence Transparency Notice */}
      <div className="ff-transparency-banner" role="note">
        <span className="ff-transparency-icon">
          <ShieldIcon size={18} />
        </span>
        <div>
          <strong>Local Alert State:</strong> FleetFocus does not include a backend{' '}
          <code>AlertController</code> persistence table. Every alert below is derived directly from
          live backend responses (<code>/api/vehicles</code>, <code>/api/trips</code>
          {permissions.canViewLiveFleet ? (
            <>
              , <code>/api/monitoring/live</code>
            </>
          ) : null}
          ). Acknowledgements are saved locally in this browser (<code>localStorage</code>) and are
          not persisted server-side.
        </div>
      </div>

      {/* KPI Summary Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Alert summary KPIs">
        <KpiCard
          label="Active Unacknowledged"
          value={state.loading ? '...' : counts.unacknowledged}
          caption={`${counts.total} total derived signals`}
          icon={<BellIcon size={20} />}
          tone={counts.unacknowledged > 0 ? 'amber' : 'emerald'}
        />
        <KpiCard
          label="Critical Alerts"
          value={state.loading ? '...' : counts.critical}
          caption={`Overspeed > ${preferences.overspeedThreshold} km/h or fuel < 15%`}
          icon={<AlertTriangleIcon size={20} />}
          tone={counts.critical > 0 ? 'red' : 'emerald'}
        />
        <KpiCard
          label="Warnings"
          value={state.loading ? '...' : counts.warning}
          caption="Maintenance, low fuel & high mileage"
          icon={<AlertTriangleIcon size={20} />}
          tone={counts.warning > 0 ? 'amber' : 'blue'}
        />
        <KpiCard
          label="Acknowledged (Local)"
          value={state.loading ? '...' : counts.acknowledged}
          caption="Stored in local browser storage"
          icon={<CheckCircleIcon size={20} />}
          tone="cyan"
        />
      </section>

      {/* Main Content Layout: Alerts Feed + Active Rules & Source Status */}
      <section className="ff-alerts-layout">
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <BellIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Derived Operational Feed</h2>
                <p className="ff-card-subtitle ff-tabular">
                  Showing {filteredAlerts.length} of {counts.total} live derived alerts
                </p>
              </div>
            </div>
            {counts.acknowledged > 0 ? (
              <button
                type="button"
                className="ff-btn ff-btn-ghost ff-btn-sm"
                onClick={handleResetAcks}
              >
                Reset Local Acknowledgements
              </button>
            ) : null}
          </div>

          <div className="ff-alerts-toolbar">
            <div className="ff-filter-pills" role="group" aria-label="Filter by severity">
              {[
                { value: 'ALL', label: `All (${counts.total})` },
                { value: 'critical', label: `Critical (${counts.critical})` },
                { value: 'warning', label: `Warning (${counts.warning})` },
                { value: 'info', label: `Info (${counts.info})` },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`ff-filter-pill ${severityFilter === opt.value ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="ff-filter-pills" role="group" aria-label="Filter by acknowledgement state">
              {[
                { value: 'ALL', label: 'All States' },
                { value: 'UNACK', label: 'Unacknowledged' },
                { value: 'ACK', label: 'Acknowledged' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`ff-filter-pill ${statusFilter === opt.value ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search alerts by plate, trip, category, or description..."
            rightActions={
              <select
                className="ff-select"
                style={{ width: 'auto', minWidth: 155 }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter alerts by category"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            }
          />

          {state.loading ? (
            <LoadingState
              title="Evaluating fleet conditions..."
              description="Inspecting live vehicles, trips, and permitted telemetry sources."
            />
          ) : allSourcesFailed ? (
            <ErrorState
              title="Unable to Derive Operational Alerts"
              description={state.vehicles.error || state.trips.error || 'Backend data sources are currently unreachable.'}
              onRetry={loadSources}
            />
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon size={22} />}
              title={counts.total === 0 ? 'All Systems Nominal' : 'No Matching Alerts'}
              description={
                counts.total === 0
                  ? 'No active maintenance, trip, or telemetry alert conditions were derived from current backend data.'
                  : 'No derived alerts match the active severity, status, category, or search filters.'
              }
              action={
                counts.total > 0 ? (
                  <button
                    type="button"
                    className="ff-btn ff-btn-secondary ff-btn-sm"
                    onClick={() => {
                      setSeverityFilter('ALL');
                      setStatusFilter('ALL');
                      setCategoryFilter('ALL');
                      setSearchQuery('');
                    }}
                  >
                    Clear Filters
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="ff-alerts-feed" role="list" aria-label="Operational alerts list">
              {filteredAlerts.map((alert) => {
                const badgeClass =
                  alert.severity === 'critical'
                    ? 'ff-badge-danger'
                    : alert.severity === 'warning'
                      ? 'ff-badge-warning'
                      : 'ff-badge-info';
                const canInspect = alert.route && canNavigateToRoute(alert.route, permissions);

                return (
                  <div
                    key={alert.id}
                    role="listitem"
                    className={`ff-alert-item sev-${alert.severity} ${alert.isAcknowledged ? 'is-acked' : ''}`}
                  >
                    <div className="ff-alert-main">
                      <div className="ff-alert-top">
                        <span className={`ff-badge ${badgeClass}`}>
                          <span className="ff-badge-dot" />
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="ff-badge ff-badge-neutral">{alert.category}</span>
                        {alert.isAcknowledged ? (
                          <span className="ff-badge ff-badge-success">Acknowledged (Local)</span>
                        ) : null}
                      </div>
                      <h3 className="ff-alert-title">{alert.title}</h3>
                      <p className="ff-alert-desc">{alert.description}</p>
                      <div className="ff-alert-meta">
                        <span>Context: {alert.meta || 'Live backend record'}</span>
                        {alert.acknowledgedAt ? (
                          <span>
                            Acked at {new Date(alert.acknowledgedAt).toLocaleTimeString('en-IN')}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="ff-alert-actions">
                      <button
                        type="button"
                        className={`ff-btn ff-btn-sm ${alert.isAcknowledged ? 'ff-btn-secondary' : 'ff-btn-primary'}`}
                        onClick={() => toggleAck(alert.id, alert.title)}
                      >
                        <CheckCircleIcon size={14} />
                        <span>{alert.isAcknowledged ? 'Restore' : 'Acknowledge'}</span>
                      </button>
                      {canInspect ? (
                        <button
                          type="button"
                          className="ff-btn ff-btn-ghost ff-btn-sm"
                          onClick={() => navigate(alert.route)}
                        >
                          <span>Inspect</span>
                          <ChevronRightIcon size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Side Column: Active Derivation Thresholds & Data Sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  <SettingsIcon size={17} />
                </span>
                <div>
                  <h2 className="ff-card-title">Active Alert Thresholds</h2>
                  <p className="ff-card-subtitle">Synced with Settings preferences</p>
                </div>
              </div>
            </div>

            <div className="ff-rule-list">
              <div className="ff-rule-row">
                <span>Overspeed (Critical)</span>
                <strong className="ff-tabular">&gt; {preferences.overspeedThreshold} km/h</strong>
              </div>
              <div className="ff-rule-row">
                <span>Low Fuel Warning</span>
                <strong className="ff-tabular">&lt; {preferences.lowFuelThreshold}%</strong>
              </div>
              <div className="ff-rule-row">
                <span>High Mileage Service</span>
                <strong className="ff-tabular">
                  &ge; {Number(preferences.serviceMileageThreshold).toLocaleString('en-IN')} km
                </strong>
              </div>
              <div className="ff-rule-row">
                <span>Maintenance Status</span>
                <strong>UNDER_MAINTENANCE</strong>
              </div>
              <div className="ff-rule-row">
                <span>Active Trips</span>
                <strong>status = ACTIVE</strong>
              </div>
            </div>
          </article>

          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  <RadarIcon size={17} />
                </span>
                <div>
                  <h2 className="ff-card-title">Permitted Data Sources</h2>
                  <p className="ff-card-subtitle">Role: {formatRoleLabel(role)}</p>
                </div>
              </div>
            </div>

            <div className="ff-rule-list">
              <div className="ff-rule-row">
                <span>/api/vehicles</span>
                <strong className="ff-tabular">
                  {state.vehicles.status === 'ready'
                    ? `${state.vehicles.items.length} loaded`
                    : state.vehicles.status === 'error'
                      ? 'Error'
                      : 'Loading...'}
                </strong>
              </div>
              <div className="ff-rule-row">
                <span>/api/trips</span>
                <strong className="ff-tabular">
                  {state.trips.status === 'ready'
                    ? `${state.trips.items.length} loaded`
                    : state.trips.status === 'error'
                      ? 'Error'
                      : 'Loading...'}
                </strong>
              </div>
              <div className="ff-rule-row">
                <span>/api/monitoring/live</span>
                <strong className="ff-tabular">
                  {state.liveFleet.status === 'restricted'
                    ? 'Restricted'
                    : state.liveFleet.status === 'ready'
                      ? `${gpsActiveCount}/${state.liveFleet.items.length} GPS live`
                      : state.liveFleet.status === 'error'
                        ? 'Error'
                        : 'Loading...'}
                </strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
