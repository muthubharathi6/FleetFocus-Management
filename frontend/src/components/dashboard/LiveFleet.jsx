import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import monitoringService from '../../services/monitoringService';
import { usePreferences } from '../../context/PreferencesContext';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import Drawer from '../common/Drawer';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  AlertTriangleIcon,
  RadarIcon,
  RefreshIcon,
  RouteIcon,
  TruckIcon,
} from '../common/Icons';

function getStatusBadge(status) {
  switch (String(status || '').toUpperCase()) {
    case 'ON_TRIP':
      return { className: 'ff-badge ff-badge-info', label: 'ON_TRIP' };
    case 'AVAILABLE':
      return { className: 'ff-badge ff-badge-success', label: 'AVAILABLE' };
    case 'UNDER_MAINTENANCE':
      return { className: 'ff-badge ff-badge-warning', label: 'UNDER_MAINTENANCE' };
    default:
      return { className: 'ff-badge ff-badge-neutral', label: status || 'UNKNOWN' };
  }
}

function formatTelemetryTime(raw) {
  if (!raw) return 'Not Available';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Not Available';
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function hasValidCoords(row) {
  return (
    row?.latitude !== null &&
    row?.latitude !== undefined &&
    row?.longitude !== null &&
    row?.longitude !== undefined &&
    Number.isFinite(Number(row.latitude)) &&
    Number.isFinite(Number(row.longitude))
  );
}

export default function LiveFleet() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences } = usePreferences();

  const role = resolveUserRole(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);
  const canViewLive = permissions.canViewLiveFleet;

  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(canViewLive);
  const [error, setError] = useState('');
  const [pollingActive, setPollingActive] = useState(preferences.pollingIntervalMs > 0);
  const [lastPolledAt, setLastPolledAt] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('plate_asc');

  const fetchFleet = useCallback(async () => {
    if (!canViewLive) return;
    try {
      const res = await monitoringService.getLiveFleet();
      setFleet(Array.isArray(res?.data) ? res.data : []);
      setError('');
      setLastPolledAt(new Date());
    } catch (err) {
      console.error('Failed to load live fleet:', err);
      setError(
        err?.response?.data?.message || 'Unable to retrieve live telemetry from /api/monitoring/live.'
      );
      setFleet([]);
    } finally {
      setLoading(false);
    }
  }, [canViewLive]);

  useEffect(() => {
    if (!canViewLive) {
      setLoading(false);
      return undefined;
    }

    fetchFleet();

    const intervalMs = preferences.pollingIntervalMs > 0 ? preferences.pollingIntervalMs : 5000;
    if (!pollingActive) return undefined;

    const timer = setInterval(fetchFleet, intervalMs);
    return () => clearInterval(timer);
  }, [canViewLive, fetchFleet, pollingActive, preferences.pollingIntervalMs]);

  const overspeedLimit = Number(preferences.overspeedThreshold) || 90;

  const metrics = useMemo(() => {
    const total = fleet.length;
    const onTrip = fleet.filter((v) => String(v?.status).toUpperCase() === 'ON_TRIP').length;
    const gpsActive = fleet.filter(hasValidCoords).length;
    const overspeed = fleet.filter(
      (v) => v?.speed !== null && v?.speed !== undefined && Number(v.speed) > overspeedLimit
    ).length;
    return { total, onTrip, gpsActive, overspeed };
  }, [fleet, overspeedLimit]);

  // Normalize real GPS coordinates onto the radar canvas
  const plottedMarkers = useMemo(() => {
    const withCoords = fleet.filter(hasValidCoords);
    if (withCoords.length === 0) return [];
    const lats = withCoords.map((v) => Number(v.latitude));
    const lngs = withCoords.map((v) => Number(v.longitude));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.5);
    const lngSpan = Math.max(maxLng - minLng, 0.5);

    return withCoords.map((v, idx) => {
      const x = withCoords.length === 1 ? 260 : 54 + ((Number(v.longitude) - minLng) / lngSpan) * 412;
      const y = withCoords.length === 1 ? 120 : 204 - ((Number(v.latitude) - minLat) / latSpan) * 164;
      const isOverspeed = v?.speed !== null && v?.speed !== undefined && Number(v.speed) > overspeedLimit;
      const color = isOverspeed
        ? '#ef4444'
        : String(v?.status).toUpperCase() === 'ON_TRIP'
          ? '#10b981'
          : '#38bdf8';
      return { ...v, key: v.vehicleId ?? v.licensePlate ?? idx, x, y, color };
    });
  }, [fleet, overspeedLimit]);

  const filteredFleet = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = fleet.filter((row) => {
      const st = String(row?.status || '').toUpperCase();
      if (statusFilter === 'GPS_ACTIVE' && !hasValidCoords(row)) return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'GPS_ACTIVE' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        String(row?.licensePlate || '').toLowerCase().includes(q) ||
        String(row?.model || '').toLowerCase().includes(q) ||
        String(row?.vin || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'speed_desc') {
        return (Number(b?.speed) || -1) - (Number(a?.speed) || -1);
      }
      if (sortBy === 'fuel_asc') {
        const fa = a?.fuelLevel === null || a?.fuelLevel === undefined ? 999 : Number(a.fuelLevel);
        const fb = b?.fuelLevel === null || b?.fuelLevel === undefined ? 999 : Number(b.fuelLevel);
        return fa - fb;
      }
      return String(a?.licensePlate || '').localeCompare(String(b?.licensePlate || ''));
    });
  }, [fleet, searchQuery, statusFilter, sortBy]);

  if (!canViewLive) {
    return (
      <main className="ff-page">
        <PageHeader
          eyebrow="LIVE TELEMETRY"
          title="Live Fleet Monitoring"
          subtitle="Real-time vehicle telemetry, GPS coordinates, speed, and fuel status."
        />
        <section className="ff-card">
          <UnavailableState
            title="Live Fleet Access Restricted"
            description="Real-time fleet monitoring (/api/monitoring/live) is restricted to Fleet Manager and Dispatcher roles."
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

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="LIVE TELEMETRY"
        title="Live Fleet Monitoring"
        subtitle="Real-time vehicle telemetry directly from /api/monitoring/live — displaying verified API values only."
        meta={
          <>
            <span className={`ff-badge ${metrics.gpsActive > 0 ? 'ff-badge-success' : 'ff-badge-neutral'}`}>
              <span className="ff-badge-dot" />
              {metrics.gpsActive > 0
                ? `GPS Active — ${metrics.gpsActive} of ${metrics.total} broadcasting`
                : `GPS Offline — 0 of ${metrics.total} broadcasting`}
            </span>
            {lastPolledAt ? (
              <span className="ff-badge ff-badge-neutral ff-tabular">
                Polled {lastPolledAt.toLocaleTimeString()}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={() => setPollingActive((prev) => !prev)}
            >
              <span>{pollingActive ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}</span>
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-primary"
              onClick={fetchFleet}
              disabled={loading}
            >
              <RefreshIcon size={15} />
              <span>{loading ? 'Loading...' : 'Refresh Now'}</span>
            </button>
          </>
        }
      />

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Telemetry metrics">
        <KpiCard
          label="Monitored Vehicles"
          value={metrics.total}
          caption="Returned by live endpoint"
          icon={<TruckIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label="Vehicles On Trip"
          value={metrics.onTrip}
          caption="Status marked ON_TRIP"
          icon={<RouteIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label="GPS Broadcasting"
          value={metrics.gpsActive}
          caption={metrics.gpsActive > 0 ? 'Active coordinates' : 'No GPS broadcasts'}
          icon={<RadarIcon size={20} />}
          tone={metrics.gpsActive > 0 ? 'emerald' : 'amber'}
        />
        <KpiCard
          label="Overspeed Alerts"
          value={metrics.overspeed}
          caption={`Threshold: > ${overspeedLimit} km/h`}
          icon={<AlertTriangleIcon size={20} />}
          tone={metrics.overspeed > 0 ? 'red' : 'emerald'}
        />
      </section>

      {/* Live Radar & Signal Summary */}
      <section className="ff-live-map-card">
        <div className="ff-card">
          <div className="ff-card-header" style={{ marginBottom: 12 }}>
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <RadarIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">GPS Coordinate Radar</h2>
                <p className="ff-card-subtitle">Click any active marker to inspect telemetry</p>
              </div>
            </div>
          </div>

          <div className="ff-live-radar-large">
            <svg viewBox="0 0 520 240" className="ff-radar-svg" role="img" aria-label="Live telemetry coordinate plot">
              <defs>
                <pattern id="ffLiveGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="520" height="240" fill="url(#ffLiveGrid)" />
              <circle cx="260" cy="120" r="95" fill="none" stroke="rgba(56, 189, 248, 0.14)" strokeDasharray="4 4" />
              <circle cx="260" cy="120" r="52" fill="none" stroke="rgba(56, 189, 248, 0.12)" />

              {plottedMarkers.length === 0 ? (
                <g>
                  <text x="260" y="114" textAnchor="middle" fill="#cbd5e1" fontSize="14" fontWeight="700">
                    No Active GPS Broadcasts
                  </text>
                  <text x="260" y="136" textAnchor="middle" fill="#94a3b8" fontSize="12">
                    Vehicles appear here when latitude and longitude are reported by telemetry
                  </text>
                </g>
              ) : (
                plottedMarkers.map((m) => (
                  <g
                    key={m.key}
                    transform={`translate(${m.x}, ${m.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedVehicle(m)}
                  >
                    <circle cx="0" cy="0" r="14" fill={m.color} fillOpacity="0.2" />
                    <circle cx="0" cy="0" r="6" fill={m.color} stroke="#050b18" strokeWidth="2" />
                    <text x="10" y="4" fill="#f1f5f9" fontSize="11" fontWeight="700">
                      {m.licensePlate || `#${m.vehicleId}`}
                    </text>
                  </g>
                ))
              )}
            </svg>
          </div>
        </div>

        <div className="ff-card">
          <div className="ff-card-header" style={{ marginBottom: 12 }}>
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <TruckIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Telemetry Feed Health</h2>
                <p className="ff-card-subtitle">Direct API field coverage</p>
              </div>
            </div>
          </div>

          <div className="ff-summary-list">
            <div className="ff-summary-row">
              <span className="ff-summary-label">Polling Mode</span>
              <span className="ff-summary-value">
                {pollingActive
                  ? `Every ${(preferences.pollingIntervalMs || 5000) / 1000}s`
                  : 'Paused'}
              </span>
            </div>
            <div className="ff-summary-row">
              <span className="ff-summary-label">GPS Coordinates Active</span>
              <span className="ff-summary-value">{metrics.gpsActive} / {metrics.total}</span>
            </div>
            <div className="ff-summary-row">
              <span className="ff-summary-label">Speed Readings Active</span>
              <span className="ff-summary-value">
                {fleet.filter((v) => v?.speed !== null && v?.speed !== undefined).length} / {metrics.total}
              </span>
            </div>
            <div className="ff-summary-row">
              <span className="ff-summary-label">Fuel Telemetry Active</span>
              <span className="ff-summary-value">
                {fleet.filter((v) => v?.fuelLevel !== null && v?.fuelLevel !== undefined).length} / {metrics.total}
              </span>
            </div>
            <div className="ff-summary-row">
              <span className="ff-summary-label">Overspeed Limit</span>
              <span className="ff-summary-value">{overspeedLimit} km/h</span>
            </div>
          </div>
        </div>
      </section>

      {/* Telemetry Table Card */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <RadarIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Fleet Telemetry Stream</h2>
              <p className="ff-card-subtitle ff-tabular">
                {filteredFleet.length} of {fleet.length} monitored vehicles
              </p>
            </div>
          </div>
        </div>

        <DataTableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search plate, model, or VIN..."
          filters={[
            { value: 'ALL', label: 'All', count: fleet.length },
            { value: 'ON_TRIP', label: 'On Trip', count: metrics.onTrip },
            { value: 'AVAILABLE', label: 'Available', count: fleet.filter((v) => String(v?.status).toUpperCase() === 'AVAILABLE').length },
            { value: 'UNDER_MAINTENANCE', label: 'Maintenance', count: fleet.filter((v) => String(v?.status).toUpperCase() === 'UNDER_MAINTENANCE').length },
            { value: 'GPS_ACTIVE', label: 'GPS Active', count: metrics.gpsActive },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'plate_asc', label: 'Sort: License Plate' },
            { value: 'speed_desc', label: 'Sort: Speed (High → Low)' },
            { value: 'fuel_asc', label: 'Sort: Lowest Fuel First' },
          ]}
        />

        {loading && fleet.length === 0 ? (
          <LoadingState
            title="Loading live telemetry..."
            description="Fetching latest vehicle positions and sensor data."
          />
        ) : error && fleet.length === 0 ? (
          <ErrorState
            title="Live Telemetry Unavailable"
            description={error}
            onRetry={fetchFleet}
          />
        ) : fleet.length === 0 ? (
          <EmptyState
            icon={<RadarIcon size={22} />}
            title="No Vehicles in Monitoring Feed"
            description="The backend live monitoring endpoint returned no vehicles."
          />
        ) : filteredFleet.length === 0 ? (
          <EmptyState
            icon={<RadarIcon size={22} />}
            title="No Matching Vehicles"
            description="No monitored vehicles match your current search or filter."
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
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Speed</th>
                  <th>GPS Location</th>
                  <th>Fuel Level</th>
                  <th>Engine Temp</th>
                  <th>Last Telemetry</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredFleet.map((row, idx) => {
                  const badge = getStatusBadge(row?.status);
                  const hasSpeed = row?.speed !== null && row?.speed !== undefined && Number.isFinite(Number(row.speed));
                  const hasFuel = row?.fuelLevel !== null && row?.fuelLevel !== undefined && Number.isFinite(Number(row.fuelLevel));
                  const hasTemp = row?.engineTemp !== null && row?.engineTemp !== undefined && Number.isFinite(Number(row.engineTemp));
                  const coordsOk = hasValidCoords(row);
                  const fuelPct = hasFuel ? Math.max(0, Math.min(100, Number(row.fuelLevel))) : 0;
                  const isOverspeed = hasSpeed && Number(row.speed) > overspeedLimit;

                  return (
                    <tr key={row?.vehicleId ?? row?.id ?? row?.licensePlate ?? idx}>
                      <td>
                        <div className="ff-cell-primary">
                          <span className="ff-cell-icon">
                            <TruckIcon size={15} />
                          </span>
                          <div className="ff-cell-stack">
                            <span className="ff-cell-title">{row?.licensePlate || 'Unknown'}</span>
                            <span className="ff-cell-sub">{row?.model || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={badge.className}>
                          <span className="ff-badge-dot" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="ff-tabular">
                        {hasSpeed ? (
                          <span style={{ fontWeight: 700, color: isOverspeed ? 'var(--ff-danger)' : 'var(--ff-text-primary)' }}>
                            {Number(row.speed).toFixed(1)} km/h
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ff-text-muted)' }}>Not Available</span>
                        )}
                      </td>

                      <td className="ff-tabular" style={{ fontSize: 12.5 }}>
                        {coordsOk ? (
                          <span style={{ color: 'var(--ff-success)', fontWeight: 600 }}>
                            {Number(row.latitude).toFixed(4)}, {Number(row.longitude).toFixed(4)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ff-text-muted)' }}>Offline</span>
                        )}
                      </td>

                      <td>
                        {hasFuel ? (
                          <div className="ff-fuel-cell">
                            <div className="ff-fuel-cell-top">
                              <span style={{ color: 'var(--ff-text-muted)' }}>Level</span>
                              <strong>{fuelPct.toFixed(0)}%</strong>
                            </div>
                            <div className="ff-progress-track">
                              <div
                                className="ff-progress-fill"
                                style={{
                                  width: `${fuelPct}%`,
                                  background:
                                    fuelPct < (preferences.lowFuelThreshold || 25)
                                      ? 'var(--ff-danger)'
                                      : 'var(--ff-cyan)',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ff-text-muted)' }}>Not Available</span>
                        )}
                      </td>

                      <td className="ff-tabular">
                        {hasTemp ? (
                          `${Number(row.engineTemp).toFixed(1)} °C`
                        ) : (
                          <span style={{ color: 'var(--ff-text-muted)' }}>Not Available</span>
                        )}
                      </td>

                      <td className="ff-tabular" style={{ fontSize: 12.5, color: 'var(--ff-text-secondary)' }}>
                        {formatTelemetryTime(row?.recordedAt)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="ff-btn ff-btn-secondary ff-btn-sm"
                          onClick={() => setSelectedVehicle(row)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Telemetry Detail Drawer */}
      <Drawer
        open={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
        eyebrow="LIVE TELEMETRY INSPECTOR"
        title={selectedVehicle?.licensePlate || 'Vehicle Telemetry'}
        subtitle={selectedVehicle?.model || 'Monitored fleet asset'}
        footer={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary ff-btn-sm"
              onClick={() => {
                setSelectedVehicle(null);
                navigate('/vehicles');
              }}
            >
              Open Vehicles
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-primary ff-btn-sm"
              onClick={() => {
                setSelectedVehicle(null);
                navigate('/trips');
              }}
            >
              Open Trips
            </button>
          </>
        }
      >
        {selectedVehicle ? (
          <div className="ff-detail-grid">
            <div className="ff-detail-item">
              <span className="ff-detail-label">Vehicle ID</span>
              <span className="ff-detail-value ff-tabular">
                #{selectedVehicle.vehicleId ?? selectedVehicle.id ?? '—'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Status</span>
              <span className="ff-detail-value">
                <span className={getStatusBadge(selectedVehicle.status).className}>
                  <span className="ff-badge-dot" />
                  {selectedVehicle.status || 'UNKNOWN'}
                </span>
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">VIN</span>
              <span className="ff-detail-value ff-mono">
                {selectedVehicle.vin || 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Speed</span>
              <span className="ff-detail-value ff-tabular">
                {selectedVehicle.speed !== null && selectedVehicle.speed !== undefined
                  ? `${Number(selectedVehicle.speed).toFixed(1)} km/h`
                  : 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Fuel Level</span>
              <span className="ff-detail-value ff-tabular">
                {selectedVehicle.fuelLevel !== null && selectedVehicle.fuelLevel !== undefined
                  ? `${Number(selectedVehicle.fuelLevel).toFixed(0)}%`
                  : 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Engine Temp</span>
              <span className="ff-detail-value ff-tabular">
                {selectedVehicle.engineTemp !== null && selectedVehicle.engineTemp !== undefined
                  ? `${Number(selectedVehicle.engineTemp).toFixed(1)} °C`
                  : 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Last Telemetry</span>
              <span className="ff-detail-value ff-tabular">
                {formatTelemetryTime(selectedVehicle.recordedAt)}
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">GPS Coordinates</span>
              <span className="ff-detail-value ff-mono">
                {hasValidCoords(selectedVehicle)
                  ? `${Number(selectedVehicle.latitude).toFixed(5)}, ${Number(selectedVehicle.longitude).toFixed(5)}`
                  : 'Offline (No GPS Broadcast)'}
              </span>
            </div>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
