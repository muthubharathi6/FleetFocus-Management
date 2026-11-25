import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import maintenanceService from '../../services/maintenanceService';
import monitoringService from '../../services/monitoringService';

import { usePreferences } from '../../context/PreferencesContext';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { downloadCsvFile, getExportDateStamp } from '../../utils/csvExport';
import { useNotifications } from '../common/NotificationStack';

import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import { DonutChart } from '../common/Charts';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  AlertTriangleIcon,
  AnalyticsIcon,
  DownloadIcon,
  FuelIcon,
  RadarIcon,
  RefreshIcon,
  ShieldIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';

const PALETTE = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

function extractList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function formatDate(date) {
  if (!date) return 'Not Available';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Not Available';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthKey(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const label = parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { key: `${year}-${month}`, label };
}

export default function FuelExpensesPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences, formatCurrency } = usePreferences();
  const notify = useNotifications();

  const role = resolveUserRole(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);

  const [state, setState] = useState({
    loading: true,
    vehicles: { items: [], status: 'loading', error: null },
    trips: { items: [], status: 'loading', error: null },
    maintenance: {
      items: [],
      status: permissions.canViewMaintenance ? 'loading' : 'restricted',
      error: null,
    },
    liveFleet: {
      items: [],
      status: permissions.canViewLiveFleet ? 'loading' : 'restricted',
      error: null,
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');

  const loadData = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      vehicles: { ...prev.vehicles, status: 'loading', error: null },
      trips: { ...prev.trips, status: 'loading', error: null },
      maintenance: permissions.canViewMaintenance
        ? { ...prev.maintenance, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
      liveFleet: permissions.canViewLiveFleet
        ? { ...prev.liveFleet, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
    }));

    const [vRes, tRes, mRes, lRes] = await Promise.allSettled([
      vehicleService.getAll(0, 200),
      tripService.getAll(),
      permissions.canViewMaintenance ? maintenanceService.getAll() : Promise.resolve(null),
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
      maintenance: !permissions.canViewMaintenance
        ? { items: [], status: 'restricted', error: null }
        : mRes.status === 'fulfilled'
          ? { items: extractList(mRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: mRes.reason?.message || 'Unable to load maintenance logs.' },
      liveFleet: !permissions.canViewLiveFleet
        ? { items: [], status: 'restricted', error: null }
        : lRes.status === 'fulfilled'
          ? { items: extractList(lRes.value), status: 'ready', error: null }
          : { items: [], status: 'error', error: lRes.reason?.message || 'Unable to load live fuel telemetry.' },
    });
  }, [permissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const logs = state.maintenance.items;
  const trips = state.trips.items;
  const liveFleet = state.liveFleet.items;
  const lowFuelThreshold = Number(preferences.lowFuelThreshold) || 25;

  const totalMaintenanceSpend = useMemo(
    () => logs.reduce((sum, l) => sum + (Number(l?.cost) || 0), 0),
    [logs]
  );

  const totalLoggedDistance = useMemo(
    () => trips.reduce((sum, t) => sum + (Number(t?.distanceCovered) || 0), 0),
    [trips]
  );

  const maintCostPerKm =
    state.maintenance.status === 'ready' && totalLoggedDistance > 0
      ? totalMaintenanceSpend / totalLoggedDistance
      : null;

  const fuelReadings = useMemo(
    () =>
      liveFleet
        .map((v) => v?.fuelLevel)
        .filter((f) => f !== null && f !== undefined && Number.isFinite(Number(f)))
        .map(Number),
    [liveFleet]
  );

  const avgFuelLevel =
    fuelReadings.length > 0
      ? fuelReadings.reduce((a, b) => a + b, 0) / fuelReadings.length
      : null;

  const lowFuelVehicles = useMemo(
    () =>
      liveFleet.filter(
        (v) =>
          v?.fuelLevel !== null &&
          v?.fuelLevel !== undefined &&
          Number.isFinite(Number(v.fuelLevel)) &&
          Number(v.fuelLevel) < lowFuelThreshold
      ),
    [liveFleet, lowFuelThreshold]
  );

  // Spend by vehicle (DonutChart)
  const vehicleCostSegments = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const c = Number(log?.cost);
      if (!Number.isFinite(c) || c <= 0) return;
      const plate = log?.vehicle?.licensePlate || `Vehicle #${log?.vehicle?.id ?? 'Other'}`;
      map.set(plate, (map.get(plate) || 0) + c);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    const list = top.map(([label, value], idx) => ({
      label,
      value,
      displayValue: formatCurrency(value),
      percent: totalMaintenanceSpend > 0 ? Math.round((value / totalMaintenanceSpend) * 100) : 0,
      color: PALETTE[idx % PALETTE.length],
    }));
    if (rest > 0) {
      list.push({
        label: 'Other Vehicles',
        value: rest,
        displayValue: formatCurrency(rest),
        percent: totalMaintenanceSpend > 0 ? Math.round((rest / totalMaintenanceSpend) * 100) : 0,
        color: PALETTE[4],
      });
    }
    return list;
  }, [logs, totalMaintenanceSpend, formatCurrency]);

  // Monthly maintenance spend breakdown (from real serviceDate)
  const monthlySpend = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const mk = formatMonthKey(log?.serviceDate);
      const cost = Number(log?.cost);
      if (!mk || !Number.isFinite(cost) || cost <= 0) return;
      const existing = map.get(mk.key) || { key: mk.key, label: mk.label, total: 0, count: 0 };
      existing.total += cost;
      existing.count += 1;
      map.set(mk.key, existing);
    });
    const rows = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    const maxVal = Math.max(1, ...rows.map((r) => r.total));
    return rows.map((r) => ({ ...r, pct: (r.total / maxVal) * 100 }));
  }, [logs]);

  const vehicleFilterOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l?.vehicle?.licensePlate).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLedger = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = logs.filter((log) => {
      const plate = log?.vehicle?.licensePlate || '';
      if (vehicleFilter !== 'ALL' && plate !== vehicleFilter) return false;
      if (!q) return true;
      return (
        plate.toLowerCase().includes(q) ||
        String(log?.description || '').toLowerCase().includes(q) ||
        String(log?.technician?.username || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'cost_desc') return (Number(b?.cost) || 0) - (Number(a?.cost) || 0);
      if (sortBy === 'cost_asc') return (Number(a?.cost) || 0) - (Number(b?.cost) || 0);
      if (sortBy === 'date_asc') return new Date(a?.serviceDate || 0) - new Date(b?.serviceDate || 0);
      return new Date(b?.serviceDate || 0) - new Date(a?.serviceDate || 0);
    });
  }, [logs, searchQuery, vehicleFilter, sortBy]);

  const handleExportLedger = () => {
    if (filteredLedger.length === 0) return;
    downloadCsvFile(
      `fleetfocus-maintenance-expenses-${getExportDateStamp()}.csv`,
      [
        { label: 'Log ID', key: 'id' },
        { label: 'Service Date', key: 'serviceDate' },
        { label: 'Vehicle Plate', getValue: (r) => r?.vehicle?.licensePlate || '' },
        { label: 'Vehicle Model', getValue: (r) => r?.vehicle?.model || '' },
        { label: 'Technician', getValue: (r) => r?.technician?.username || '' },
        { label: 'Description', key: 'description' },
        { label: 'Mileage At Service (km)', key: 'mileageAtService' },
        { label: `Cost (${preferences.currency})`, key: 'cost' },
      ],
      filteredLedger
    );
    if (typeof notify === 'function') {
      notify(`Exported ${filteredLedger.length} maintenance expense records to CSV.`, 'success');
    }
  };

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="FINANCE & FUEL TELEMETRY"
        title="Fuel & Expenses"
        subtitle="Verified maintenance expenditure from service logs paired with live vehicle fuel sensor telemetry."
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={loadData}
              disabled={state.loading}
            >
              <RefreshIcon size={15} />
              <span>{state.loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {permissions.canViewMaintenance ? (
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                onClick={handleExportLedger}
                disabled={filteredLedger.length === 0}
              >
                <DownloadIcon size={15} />
                <span>Export Ledger CSV</span>
              </button>
            ) : null}
          </>
        }
      />

      {/* Explicit Data Transparency Notice (Requirement #2) */}
      <div className="ff-transparency-banner" role="note">
        <span className="ff-transparency-icon">
          <ShieldIcon size={18} />
        </span>
        <div>
          <strong>Data Transparency:</strong> Financial figures reflect{' '}
          <strong>actual recorded maintenance expenditure</strong> from{' '}
          <code>/api/maintenance</code>. Fuel purchase transactions and fuel consumption invoices are
          not stored in the current backend schema — fuel metrics below show live telemetry sensor
          levels (<code>/api/monitoring/live</code>) only and are never converted into estimated fuel spend.
        </div>
      </div>

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Fuel and expense KPIs">
        <KpiCard
          label="Actual Maintenance Spend"
          value={
            state.maintenance.status === 'ready'
              ? formatCurrency(totalMaintenanceSpend)
              : state.maintenance.status === 'restricted'
                ? 'Restricted'
                : state.maintenance.status === 'error'
                  ? 'Error'
                  : '...'
          }
          caption={
            state.maintenance.status === 'ready'
              ? `Across ${logs.length} recorded service logs`
              : state.maintenance.status === 'restricted'
                ? 'Fleet Manager & Tech only'
                : 'Actual service costs'
          }
          icon={<WrenchIcon size={20} />}
          tone="purple"
        />

        <KpiCard
          label="Maint. Cost / Logged km"
          value={
            state.maintenance.status === 'restricted'
              ? 'Restricted'
              : maintCostPerKm !== null
                ? `${formatCurrency(maintCostPerKm)}/km`
                : 'Not Available'
          }
          caption={
            maintCostPerKm !== null
              ? `Derived ratio across ${totalLoggedDistance.toFixed(1)} km`
              : 'Derived metric (requires logs & distance)'
          }
          icon={<AnalyticsIcon size={20} />}
          tone="blue"
        />

        <KpiCard
          label="Avg Live Fuel Level"
          value={
            state.liveFleet.status === 'restricted'
              ? 'Restricted'
              : avgFuelLevel !== null
                ? `${avgFuelLevel.toFixed(0)}%`
                : 'Not Available'
          }
          caption={
            state.liveFleet.status === 'restricted'
              ? 'Fleet Manager & Dispatcher only'
              : fuelReadings.length > 0
                ? `Telemetry active on ${fuelReadings.length}/${liveFleet.length} vehicles`
                : 'No live fuel sensors reporting'
          }
          icon={<FuelIcon size={20} />}
          tone="cyan"
        />

        <KpiCard
          label="Low-Fuel Vehicles"
          value={
            state.liveFleet.status === 'restricted'
              ? 'Restricted'
              : fuelReadings.length > 0
                ? lowFuelVehicles.length
                : 'Not Available'
          }
          caption={
            state.liveFleet.status === 'restricted'
              ? 'Telemetry restricted'
              : `Below ${lowFuelThreshold}% sensor threshold`
          }
          icon={<AlertTriangleIcon size={20} />}
          tone={lowFuelVehicles.length > 0 ? 'red' : 'emerald'}
        />
      </section>

      {/* Visual Breakdown Row */}
      <section className="ff-intel-grid-2">
        {/* Actual Maintenance Expenditure Breakdown */}
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span
                className="ff-card-icon"
                style={{
                  background: 'var(--ff-purple-bg)',
                  color: '#a78bfa',
                  borderColor: 'var(--ff-purple-border)',
                }}
              >
                <WrenchIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Actual Spend by Vehicle & Month</h2>
                <p className="ff-card-subtitle">Verified maintenance expenditure only</p>
              </div>
            </div>
          </div>

          {state.maintenance.status === 'restricted' ? (
            <UnavailableState
              title="Expenditure Breakdown Restricted"
              description="Maintenance cost records (/api/maintenance) are restricted to Fleet Manager and Maintenance Technician roles."
            />
          ) : state.maintenance.status === 'loading' ? (
            <LoadingState title="Loading expenditure..." description="Aggregating maintenance service logs." />
          ) : state.maintenance.status === 'error' ? (
            <ErrorState
              title="Expenditure Data Unavailable"
              description={state.maintenance.error}
              onRetry={loadData}
            />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<WrenchIcon size={20} />}
              title="No Expenditure Logged"
              description="No maintenance service costs exist in the database yet."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="ff-expense-body">
                <DonutChart
                  segments={vehicleCostSegments}
                  centerValue={formatCurrency(totalMaintenanceSpend)}
                  centerLabel="Actual Total"
                  size={146}
                  strokeWidth={14}
                />
                <div className="ff-expense-legend">
                  {vehicleCostSegments.map((seg) => (
                    <div key={seg.label} className="ff-expense-legend-row">
                      <span className="ff-expense-legend-name">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: seg.color,
                            flexShrink: 0,
                          }}
                        />
                        <strong>{seg.label}</strong> ({seg.percent}%)
                      </span>
                      <span className="ff-expense-legend-val">{seg.displayValue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {monthlySpend.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--ff-text-muted)',
                      marginBottom: 10,
                    }}
                  >
                    Monthly Maintenance Totals
                  </div>
                  <div className="ff-monthly-bars">
                    {monthlySpend.map((m) => (
                      <div key={m.key} className="ff-monthly-row">
                        <div className="ff-monthly-top">
                          <span style={{ color: 'var(--ff-text-secondary)', fontWeight: 600 }}>
                            {m.label} ({m.count} {m.count === 1 ? 'log' : 'logs'})
                          </span>
                          <strong className="ff-tabular">{formatCurrency(m.total)}</strong>
                        </div>
                        <div className="ff-progress-track">
                          <div
                            className="ff-progress-fill"
                            style={{ width: `${m.pct}%`, background: 'var(--ff-gradient-primary)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </article>

        {/* Live Fuel Telemetry Card */}
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <FuelIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Live Fuel Level Telemetry</h2>
                <p className="ff-card-subtitle">Direct sensor percentage readings (no cost estimates)</p>
              </div>
            </div>
          </div>

          {state.liveFleet.status === 'restricted' ? (
            <UnavailableState
              title="Fuel Telemetry Restricted"
              description="Live fuel level telemetry (/api/monitoring/live) is restricted to Fleet Manager and Dispatcher roles."
            />
          ) : state.liveFleet.status === 'loading' ? (
            <LoadingState title="Loading fuel telemetry..." description="Checking vehicle sensor percentages." />
          ) : state.liveFleet.status === 'error' ? (
            <ErrorState
              title="Fuel Telemetry Unavailable"
              description={state.liveFleet.error}
              onRetry={loadData}
            />
          ) : liveFleet.length === 0 ? (
            <EmptyState
              icon={<RadarIcon size={20} />}
              title="No Vehicles in Telemetry"
              description="No monitored vehicles were returned by /api/monitoring/live."
            />
          ) : (
            <div className="ff-fuel-list">
              {liveFleet.map((v, idx) => {
                const hasFuel =
                  v?.fuelLevel !== null &&
                  v?.fuelLevel !== undefined &&
                  Number.isFinite(Number(v.fuelLevel));
                const pct = hasFuel ? Math.max(0, Math.min(100, Number(v.fuelLevel))) : 0;
                const isLow = hasFuel && pct < lowFuelThreshold;

                return (
                  <div key={v.vehicleId ?? v.licensePlate ?? idx} className="ff-fuel-row">
                    <div className="ff-fuel-row-left">
                      <strong style={{ fontSize: 13.5, color: 'var(--ff-text-primary)' }}>
                        {v.licensePlate || `Vehicle #${v.vehicleId}`}
                      </strong>
                      <span style={{ fontSize: 12, color: 'var(--ff-text-muted)' }}>
                        {v.model || 'Fleet Vehicle'} · {v.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="ff-fuel-row-right">
                      {hasFuel ? (
                        <>
                          <strong
                            className="ff-tabular"
                            style={{
                              fontSize: 13,
                              color: isLow ? 'var(--ff-danger)' : 'var(--ff-cyan-bright)',
                            }}
                          >
                            {pct.toFixed(0)}% {isLow ? '(Low)' : ''}
                          </strong>
                          <div className="ff-progress-track" style={{ width: 130 }}>
                            <div
                              className="ff-progress-fill"
                              style={{
                                width: `${pct}%`,
                                background: isLow ? 'var(--ff-danger)' : 'var(--ff-cyan)',
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="ff-badge ff-badge-neutral">Not Available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      {/* Actual Maintenance Expenditure Ledger */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <TruckIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Actual Expense Ledger (Maintenance Services)</h2>
              <p className="ff-card-subtitle ff-tabular">
                {state.maintenance.status === 'ready'
                  ? `${filteredLedger.length} of ${logs.length} verified records`
                  : 'Verified financial entries from /api/maintenance'}
              </p>
            </div>
          </div>
        </div>

        {state.maintenance.status === 'restricted' ? (
          <UnavailableState
            title="Expense Ledger Restricted"
            description="Only Fleet Manager and Maintenance Technician roles have backend permission to access /api/maintenance."
          />
        ) : state.maintenance.status === 'loading' ? (
          <LoadingState title="Loading expense ledger..." description="Fetching actual service expenditure entries." />
        ) : state.maintenance.status === 'error' ? (
          <ErrorState
            title="Unable to load expense ledger"
            description={state.maintenance.error}
            onRetry={loadData}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<FuelIcon size={22} />}
            title="No Expense Entries Yet"
            description="No maintenance expenditure logs have been recorded."
          />
        ) : (
          <>
            <DataTableToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search plate, description, or technician..."
              sortValue={sortBy}
              onSortChange={setSortBy}
              sortOptions={[
                { value: 'date_desc', label: 'Sort: Newest Date' },
                { value: 'date_asc', label: 'Sort: Oldest Date' },
                { value: 'cost_desc', label: 'Sort: Highest Cost' },
                { value: 'cost_asc', label: 'Sort: Lowest Cost' },
              ]}
              rightActions={
                <select
                  className="ff-select"
                  style={{ width: 'auto', minWidth: 145 }}
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  aria-label="Filter expenses by vehicle"
                >
                  <option value="ALL">All Vehicles</option>
                  {vehicleFilterOptions.map((plate) => (
                    <option key={plate} value={plate}>
                      {plate}
                    </option>
                  ))}
                </select>
              }
            />

            {filteredLedger.length === 0 ? (
              <EmptyState
                icon={<FuelIcon size={20} />}
                title="No Matching Entries"
                description="No maintenance expense records match your search or filter."
                action={
                  <button
                    type="button"
                    className="ff-btn ff-btn-secondary ff-btn-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setVehicleFilter('ALL');
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
                      <th>Service Date</th>
                      <th>Vehicle</th>
                      <th>Service Description</th>
                      <th>Technician</th>
                      <th>Mileage</th>
                      <th style={{ textAlign: 'right' }}>Actual Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((log) => (
                      <tr key={log.id}>
                        <td className="ff-tabular" style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(log.serviceDate)}
                        </td>
                        <td>
                          <strong>{log.vehicle?.licensePlate || 'Unknown'}</strong>
                          <div style={{ fontSize: 12, color: 'var(--ff-text-muted)' }}>
                            {log.vehicle?.model || '—'}
                          </div>
                        </td>
                        <td style={{ color: 'var(--ff-text-secondary)' }}>
                          {log.description || 'Service recorded'}
                        </td>
                        <td>{log.technician?.username || 'Unassigned'}</td>
                        <td className="ff-tabular">
                          {log.mileageAtService !== null && log.mileageAtService !== undefined
                            ? `${Number(log.mileageAtService).toLocaleString('en-IN')} km`
                            : 'Not Available'}
                        </td>
                        <td className="ff-tabular" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(log.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
