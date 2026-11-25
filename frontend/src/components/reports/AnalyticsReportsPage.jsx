import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import maintenanceService from '../../services/maintenanceService';
import driverService from '../../services/driverService';

import { usePreferences } from '../../context/PreferencesContext';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { downloadCsvFile, getExportDateStamp } from '../../utils/csvExport';
import { useNotifications } from '../common/NotificationStack';

import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import { DualBarChart, HorizontalProgressList, RadialGauge } from '../common/Charts';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  AnalyticsIcon,
  DownloadIcon,
  DriversIcon,
  RefreshIcon,
  RouteIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';

function extractList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function getRangeCutoff(range) {
  if (range === 'ALL') return null;
  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

function isWithinRange(dateValue, cutoffMs) {
  if (cutoffMs === null) return true;
  if (!dateValue) return false;
  const ts = new Date(dateValue).getTime();
  return !Number.isNaN(ts) && ts >= cutoffMs;
}

function buildTripSeries(trips) {
  const map = new Map();
  trips.forEach((trip) => {
    const raw = trip?.startTime || trip?.endTime;
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const entry = map.get(key) || { key, label, primary: 0, secondary: 0 };
    const st = String(trip?.status || '').toUpperCase();
    if (st === 'COMPLETED') entry.primary += 1;
    else if (st === 'ACTIVE') entry.secondary += 1;
    map.set(key, entry);
  });
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export default function AnalyticsReportsPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences, formatCurrency } = usePreferences();
  const notify = useNotifications();

  const role = resolveUserRole(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);

  const [range, setRange] = useState('ALL');
  const [state, setState] = useState({
    loading: true,
    vehicles: { items: [], status: 'loading', error: null },
    trips: { items: [], status: 'loading', error: null },
    maintenance: {
      items: [],
      status: permissions.canViewMaintenance ? 'loading' : 'restricted',
      error: null,
    },
    drivers: {
      items: [],
      status: permissions.canViewDrivers ? 'loading' : 'restricted',
      error: null,
    },
  });

  const loadAnalytics = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      vehicles: { ...prev.vehicles, status: 'loading', error: null },
      trips: { ...prev.trips, status: 'loading', error: null },
      maintenance: permissions.canViewMaintenance
        ? { ...prev.maintenance, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
      drivers: permissions.canViewDrivers
        ? { ...prev.drivers, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
    }));

    const [vRes, tRes, mRes, dRes] = await Promise.allSettled([
      vehicleService.getAll(0, 200),
      tripService.getAll(),
      permissions.canViewMaintenance ? maintenanceService.getAll() : Promise.resolve(null),
      permissions.canViewDrivers ? driverService.getAll() : Promise.resolve(null),
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
      maintenance: !permissions.canViewMaintenance
        ? { items: [], status: 'restricted', error: null }
        : mRes.status === 'fulfilled'
          ? { items: extractList(mRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: mRes.reason?.message || 'Unable to load maintenance logs.' },
      drivers: !permissions.canViewDrivers
        ? { items: [], status: 'restricted', error: null }
        : dRes.status === 'fulfilled'
          ? { items: extractList(dRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: dRes.reason?.message || 'Unable to load drivers.' },
    });
  }, [permissions]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const cutoffMs = useMemo(() => getRangeCutoff(range), [range]);

  const vehicles = state.vehicles.items;
  const filteredTrips = useMemo(
    () => state.trips.items.filter((t) => isWithinRange(t?.startTime || t?.endTime, cutoffMs)),
    [state.trips.items, cutoffMs]
  );
  const filteredMaintenance = useMemo(
    () => state.maintenance.items.filter((m) => isWithinRange(m?.serviceDate, cutoffMs)),
    [state.maintenance.items, cutoffMs]
  );
  const drivers = state.drivers.items;

  // Real KPI calculations
  const totalVehicles = vehicles.length;
  const onTripVehicles = vehicles.filter((v) => String(v?.status).toUpperCase() === 'ON_TRIP').length;
  const availableVehicles = vehicles.filter((v) => String(v?.status).toUpperCase() === 'AVAILABLE').length;
  const maintVehicles = vehicles.filter((v) => String(v?.status).toUpperCase() === 'UNDER_MAINTENANCE').length;
  const utilizationPct = totalVehicles > 0 ? (onTripVehicles / totalVehicles) * 100 : 0;

  const completedTrips = filteredTrips.filter((t) => String(t?.status).toUpperCase() === 'COMPLETED').length;
  const activeTrips = filteredTrips.filter((t) => String(t?.status).toUpperCase() === 'ACTIVE').length;
  const periodDistance = filteredTrips.reduce((s, t) => s + (Number(t?.distanceCovered) || 0), 0);
  const periodMaintSpend = filteredMaintenance.reduce((s, m) => s + (Number(m?.cost) || 0), 0);

  const tripChartData = useMemo(() => buildTripSeries(filteredTrips), [filteredTrips]);

  const statusBreakdown = useMemo(
    () => [
      {
        label: 'Available',
        count: availableVehicles,
        percent: totalVehicles > 0 ? (availableVehicles / totalVehicles) * 100 : 0,
        color: '#10b981',
      },
      {
        label: 'On Trip',
        count: onTripVehicles,
        percent: totalVehicles > 0 ? (onTripVehicles / totalVehicles) * 100 : 0,
        color: '#38bdf8',
      },
      {
        label: 'Under Maintenance',
        count: maintVehicles,
        percent: totalVehicles > 0 ? (maintVehicles / totalVehicles) * 100 : 0,
        color: '#f59e0b',
      },
    ],
    [availableVehicles, onTripVehicles, maintVehicles, totalVehicles]
  );

  // Vehicle Leaderboard: real odometer, trip count, and actual maintenance spend
  const vehicleLeaderboard = useMemo(() => {
    const tripCountByVehicle = new Map();
    const distByVehicle = new Map();
    filteredTrips.forEach((t) => {
      const id = t?.vehicle?.id;
      if (id === null || id === undefined) return;
      tripCountByVehicle.set(id, (tripCountByVehicle.get(id) || 0) + 1);
      distByVehicle.set(id, (distByVehicle.get(id) || 0) + (Number(t?.distanceCovered) || 0));
    });

    const spendByVehicle = new Map();
    filteredMaintenance.forEach((m) => {
      const id = m?.vehicle?.id;
      if (id === null || id === undefined) return;
      spendByVehicle.set(id, (spendByVehicle.get(id) || 0) + (Number(m?.cost) || 0));
    });

    return [...vehicles]
      .map((v) => ({
        ...v,
        periodTrips: tripCountByVehicle.get(v.id) || 0,
        periodDistance: distByVehicle.get(v.id) || 0,
        periodSpend: spendByVehicle.get(v.id) || 0,
      }))
      .sort((a, b) => (Number(b.currentMileage) || 0) - (Number(a.currentMileage) || 0));
  }, [vehicles, filteredTrips, filteredMaintenance]);

  // Driver Leaderboard: real trips & distance
  const driverLeaderboard = useMemo(() => {
    const stats = new Map();
    filteredTrips.forEach((t) => {
      const id = t?.driver?.id;
      if (id === null || id === undefined) return;
      const cur = stats.get(id) || { trips: 0, completed: 0, distance: 0 };
      cur.trips += 1;
      if (String(t?.status).toUpperCase() === 'COMPLETED') cur.completed += 1;
      cur.distance += Number(t?.distanceCovered) || 0;
      stats.set(id, cur);
    });

    return [...drivers]
      .map((d) => {
        const s = stats.get(d.id) || { trips: 0, completed: 0, distance: 0 };
        return { ...d, ...s };
      })
      .sort((a, b) => b.distance - a.distance || b.trips - a.trips);
  }, [drivers, filteredTrips]);

  const stamp = getExportDateStamp();

  const exportVehicles = () => {
    downloadCsvFile(
      `fleetfocus-vehicles-${stamp}.csv`,
      [
        { label: 'ID', key: 'id' },
        { label: 'License Plate', key: 'licensePlate' },
        { label: 'Model', key: 'model' },
        { label: 'VIN', key: 'vin' },
        { label: 'Status', key: 'status' },
        { label: 'Current Mileage (km)', key: 'currentMileage' },
      ],
      vehicles
    );
    if (typeof notify === 'function') notify(`Exported ${vehicles.length} vehicles to CSV.`, 'success');
  };

  const exportTrips = () => {
    downloadCsvFile(
      `fleetfocus-trips-${range.toLowerCase()}-${stamp}.csv`,
      [
        { label: 'Trip ID', key: 'id' },
        { label: 'Vehicle Plate', getValue: (r) => r?.vehicle?.licensePlate || '' },
        { label: 'Driver', getValue: (r) => r?.driver?.user?.username || '' },
        { label: 'Status', key: 'status' },
        { label: 'Start Time', key: 'startTime' },
        { label: 'End Time', key: 'endTime' },
        { label: 'Distance (km)', key: 'distanceCovered' },
      ],
      filteredTrips
    );
    if (typeof notify === 'function') notify(`Exported ${filteredTrips.length} trips to CSV.`, 'success');
  };

  const exportMaintenance = () => {
    downloadCsvFile(
      `fleetfocus-maintenance-${range.toLowerCase()}-${stamp}.csv`,
      [
        { label: 'Log ID', key: 'id' },
        { label: 'Service Date', key: 'serviceDate' },
        { label: 'Vehicle Plate', getValue: (r) => r?.vehicle?.licensePlate || '' },
        { label: 'Technician', getValue: (r) => r?.technician?.username || '' },
        { label: 'Description', key: 'description' },
        { label: 'Mileage At Service (km)', key: 'mileageAtService' },
        { label: `Cost (${preferences.currency})`, key: 'cost' },
      ],
      filteredMaintenance
    );
    if (typeof notify === 'function') notify(`Exported ${filteredMaintenance.length} maintenance logs to CSV.`, 'success');
  };

  const exportDrivers = () => {
    downloadCsvFile(
      `fleetfocus-drivers-${stamp}.csv`,
      [
        { label: 'Driver ID', key: 'id' },
        { label: 'Username', getValue: (r) => r?.user?.username || '' },
        { label: 'Email', getValue: (r) => r?.user?.email || '' },
        { label: 'License Number', key: 'licenseNumber' },
        { label: 'Status', key: 'status' },
        { label: 'Trips In Period', key: 'trips' },
        { label: 'Distance In Period (km)', key: 'distance' },
      ],
      driverLeaderboard
    );
    if (typeof notify === 'function') notify(`Exported ${driverLeaderboard.length} drivers to CSV.`, 'success');
  };

  const rangeLabel = range === 'ALL' ? 'All Time' : `Last ${range}`;

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="FLEET INTELLIGENCE"
        title="Analytics & Reports"
        subtitle="Cross-fleet utilization, trip activity, asset performance leaderboards, and live CSV / print exports."
        actions={
          <>
            <div className="ff-filter-pills" role="tablist" aria-label="Analytics date range">
              {[
                { value: '7D', label: '7D' },
                { value: '30D', label: '30D' },
                { value: '90D', label: '90D' },
                { value: 'ALL', label: 'All Time' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={range === opt.value}
                  className={`ff-filter-pill ${range === opt.value ? 'is-active' : ''}`}
                  onClick={() => setRange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={loadAnalytics}
              disabled={state.loading}
            >
              <RefreshIcon size={15} />
              <span>{state.loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="ff-btn ff-btn-primary"
              onClick={() => window.print()}
            >
              <DownloadIcon size={15} />
              <span>Print / PDF</span>
            </button>
          </>
        }
      />

      {/* Executive KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Analytics KPIs">
        <KpiCard
          label="Fleet Utilization"
          value={`${utilizationPct.toFixed(0)}%`}
          caption={`${onTripVehicles} of ${totalVehicles} vehicles ON_TRIP`}
          icon={<TruckIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label={`Trips (${rangeLabel})`}
          value={filteredTrips.length}
          caption={`${completedTrips} completed · ${activeTrips} active`}
          icon={<RouteIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label={`Distance (${rangeLabel})`}
          value={`${periodDistance.toFixed(1)} km`}
          caption={
            filteredTrips.length > 0
              ? `Avg ${(periodDistance / filteredTrips.length).toFixed(1)} km/trip`
              : 'No trips in selected window'
          }
          icon={<AnalyticsIcon size={20} />}
          tone="emerald"
        />
        <KpiCard
          label={`Maint. Spend (${rangeLabel})`}
          value={
            state.maintenance.status === 'ready'
              ? formatCurrency(periodMaintSpend)
              : state.maintenance.status === 'restricted'
                ? 'Restricted'
                : '...'
          }
          caption={
            state.maintenance.status === 'ready'
              ? `${filteredMaintenance.length} service logs in period`
              : 'Fleet Manager & Tech only'
          }
          icon={<WrenchIcon size={20} />}
          tone="purple"
        />
      </section>

      {/* Charts Row */}
      <section className="ff-intel-grid-2">
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <RouteIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Trip Activity by Month ({rangeLabel})</h2>
                <p className="ff-card-subtitle">Actual completed vs active trips from /api/trips</p>
              </div>
            </div>
          </div>

          {state.trips.status === 'loading' ? (
            <LoadingState title="Analyzing trips..." description="Grouping trip history from backend." />
          ) : state.trips.status === 'error' ? (
            <ErrorState title="Trip Analytics Unavailable" description={state.trips.error} onRetry={loadAnalytics} />
          ) : tripChartData.length === 0 ? (
            <EmptyState
              icon={<RouteIcon size={20} />}
              title={`No Trips in ${rangeLabel}`}
              description="Switch to a wider timeframe (e.g. All Time) to inspect historical trip activity."
            />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 12, color: 'var(--ff-text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="ff-badge-dot" style={{ color: '#06b6d4' }} />
                  Completed
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="ff-badge-dot" style={{ color: '#3b82f6' }} />
                  Active
                </span>
              </div>
              <DualBarChart
                data={tripChartData}
                primaryLabel="Completed"
                secondaryLabel="Active"
                primaryColor="#06b6d4"
                secondaryColor="#3b82f6"
                height={180}
              />
            </>
          )}
        </article>

        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <AnalyticsIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Fleet Status & Utilization</h2>
                <p className="ff-card-subtitle">Live vehicle allocation across {totalVehicles} assets</p>
              </div>
            </div>
          </div>

          {state.vehicles.status === 'loading' && totalVehicles === 0 ? (
            <LoadingState title="Loading fleet status..." description="Calculating real utilization ratios." />
          ) : state.vehicles.status === 'error' ? (
            <ErrorState title="Vehicle Status Unavailable" description={state.vehicles.error} onRetry={loadAnalytics} />
          ) : totalVehicles === 0 ? (
            <EmptyState
              icon={<TruckIcon size={20} />}
              title="No Vehicles Registered"
              description="Register fleet vehicles to view utilization analytics."
            />
          ) : (
            <div className="ff-perf-body">
              <RadialGauge percent={utilizationPct} label="Utilization" size={134} strokeWidth={12} />
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <HorizontalProgressList items={statusBreakdown} />
              </div>
            </div>
          )}
        </article>
      </section>

      {/* Leaderboards Row */}
      <section className="ff-intel-grid-2">
        {/* Top Vehicles by Mileage & Spend */}
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <TruckIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Vehicle Performance Summary</h2>
                <p className="ff-card-subtitle">Sorted by current odometer mileage</p>
              </div>
            </div>
          </div>

          {vehicleLeaderboard.length === 0 ? (
            <EmptyState
              icon={<TruckIcon size={20} />}
              title="No Vehicle Data"
              description="No fleet vehicles are available for ranking."
            />
          ) : (
            <div className="ff-table-wrap">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Odometer</th>
                    <th>Trips ({rangeLabel})</th>
                    {permissions.canViewMaintenance ? <th>Maint. Spend</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {vehicleLeaderboard.slice(0, 8).map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.licensePlate || '—'}</strong>
                        <div style={{ fontSize: 12, color: 'var(--ff-text-muted)' }}>
                          {v.model || '—'}
                        </div>
                      </td>
                      <td className="ff-tabular">
                        {Number.isFinite(Number(v.currentMileage))
                          ? `${Number(v.currentMileage).toLocaleString('en-IN')} km`
                          : 'Not Available'}
                      </td>
                      <td className="ff-tabular">
                        {v.periodTrips} ({v.periodDistance.toFixed(1)} km)
                      </td>
                      {permissions.canViewMaintenance ? (
                        <td className="ff-tabular" style={{ fontWeight: 700 }}>
                          {formatCurrency(v.periodSpend)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Driver Activity Leaderboard */}
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <DriversIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Driver Activity Summary</h2>
                <p className="ff-card-subtitle">Real trips & distance ({rangeLabel})</p>
              </div>
            </div>
          </div>

          {state.drivers.status === 'restricted' ? (
            <UnavailableState
              title="Driver Analytics Restricted"
              description="Driver directory analytics (/api/drivers) are restricted to Fleet Manager, Dispatcher, and Admin roles."
            />
          ) : state.drivers.status === 'loading' ? (
            <LoadingState title="Loading driver analytics..." description="Aggregating trips per driver." />
          ) : state.drivers.status === 'error' ? (
            <ErrorState title="Driver Data Unavailable" description={state.drivers.error} onRetry={loadAnalytics} />
          ) : driverLeaderboard.length === 0 ? (
            <EmptyState
              icon={<DriversIcon size={20} />}
              title="No Drivers Registered"
              description="No driver profiles exist in the database."
            />
          ) : (
            <div className="ff-table-wrap">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Trips</th>
                    <th>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {driverLeaderboard.slice(0, 8).map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.user?.username || `Driver #${d.id}`}</strong>
                        <div className="ff-mono" style={{ fontSize: 11.5, color: 'var(--ff-text-muted)' }}>
                          {d.licenseNumber || '—'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`ff-badge ${
                            d.status === 'AVAILABLE'
                              ? 'ff-badge-success'
                              : d.status === 'ON_TRIP'
                                ? 'ff-badge-info'
                                : 'ff-badge-neutral'
                          }`}
                        >
                          <span className="ff-badge-dot" />
                          {d.status}
                        </span>
                      </td>
                      <td className="ff-tabular">
                        {d.trips} ({d.completed} done)
                      </td>
                      <td className="ff-tabular" style={{ fontWeight: 700 }}>
                        {d.distance.toFixed(1)} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {/* CSV & Print Export Center */}
      <section className="ff-card ff-no-print">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <DownloadIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Report Export Center</h2>
              <p className="ff-card-subtitle">
                Download live backend datasets as CSV spreadsheets (role-scoped)
              </p>
            </div>
          </div>
        </div>

        <div className="ff-export-grid">
          <button
            type="button"
            className="ff-export-tile"
            onClick={exportVehicles}
            disabled={vehicles.length === 0}
          >
            <span className="ff-export-tile-title">Export Vehicles CSV</span>
            <span className="ff-export-tile-sub">{vehicles.length} fleet vehicles ready</span>
          </button>

          <button
            type="button"
            className="ff-export-tile"
            onClick={exportTrips}
            disabled={filteredTrips.length === 0}
          >
            <span className="ff-export-tile-title">Export Trips CSV</span>
            <span className="ff-export-tile-sub">
              {filteredTrips.length} trips ({rangeLabel})
            </span>
          </button>

          <button
            type="button"
            className="ff-export-tile"
            onClick={exportMaintenance}
            disabled={!permissions.canViewMaintenance || filteredMaintenance.length === 0}
          >
            <span className="ff-export-tile-title">Export Maintenance CSV</span>
            <span className="ff-export-tile-sub">
              {!permissions.canViewMaintenance
                ? 'Restricted for your role'
                : `${filteredMaintenance.length} logs (${rangeLabel})`}
            </span>
          </button>

          <button
            type="button"
            className="ff-export-tile"
            onClick={exportDrivers}
            disabled={!permissions.canViewDrivers || driverLeaderboard.length === 0}
          >
            <span className="ff-export-tile-title">Export Drivers CSV</span>
            <span className="ff-export-tile-sub">
              {!permissions.canViewDrivers
                ? 'Restricted for your role'
                : `${driverLeaderboard.length} driver profiles`}
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
