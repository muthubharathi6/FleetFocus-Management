import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import maintenanceService from '../../services/maintenanceService';
import { usePreferences } from '../../context/PreferencesContext';
import { getPermissions, resolveUserRole } from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';
import PageHeader from '../common/PageHeader';
import KpiCard from '../common/KpiCard';
import DataTableToolbar from '../common/DataTableToolbar';
import Modal from '../common/Modal';
import Drawer from '../common/Drawer';
import { DonutChart } from '../common/Charts';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  AnalyticsIcon,
  CheckCircleIcon,
  FuelIcon,
  PlusIcon,
  RefreshIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';
import MaintenanceForm from './MaintenanceForm';

const CHART_PALETTE = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

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

export default function MaintenanceList() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const { formatCurrency } = usePreferences();
  const notify = useNotifications();

  const role = resolveUserRole(user);
  const permissions = useMemo(() => getPermissions(role), [role]);
  const canViewMaintenance = permissions.canViewMaintenance;
  const canManageMaintenance = permissions.canManageMaintenance;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(canViewMaintenance);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [techFilter, setTechFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');

  const fetchLogs = useCallback(async () => {
    if (!canViewMaintenance) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await maintenanceService.getAll();
      const data = response?.data;
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (Array.isArray(data?.content)) {
        setLogs(data.content);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to load maintenance records:', err);
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
      }
      setError(
        err?.response?.data?.message || 'Unable to load maintenance records.'
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [canViewMaintenance]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Derived real metrics
  const vehiclesServiced = useMemo(() => {
    const ids = logs
      .map((log) => log?.vehicle?.id)
      .filter((id) => id !== undefined && id !== null);
    return new Set(ids).size;
  }, [logs]);

  const totalCost = useMemo(
    () => logs.reduce((sum, log) => sum + (Number(log?.cost) || 0), 0),
    [logs]
  );

  const avgCost = logs.length > 0 ? totalCost / logs.length : 0;

  // Unique dropdown filter options from real logs
  const vehicleOptions = useMemo(() => {
    const plates = new Set(
      logs.map((l) => l?.vehicle?.licensePlate).filter(Boolean)
    );
    return Array.from(plates).sort();
  }, [logs]);

  const techOptions = useMemo(() => {
    const techs = new Set(
      logs.map((l) => l?.technician?.username).filter(Boolean)
    );
    return Array.from(techs).sort();
  }, [logs]);

  // Cost by vehicle breakdown for DonutChart
  const costSegments = useMemo(() => {
    const byPlate = new Map();
    logs.forEach((log) => {
      const c = Number(log?.cost);
      if (!Number.isFinite(c) || c <= 0) return;
      const plate = log?.vehicle?.licensePlate || `Vehicle #${log?.vehicle?.id ?? 'Other'}`;
      byPlate.set(plate, (byPlate.get(plate) || 0) + c);
    });
    const sorted = Array.from(byPlate.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    const segs = top.map(([label, value], idx) => ({
      label,
      value,
      displayValue: formatCurrency(value),
      percent: totalCost > 0 ? Math.round((value / totalCost) * 100) : 0,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
    }));
    if (rest > 0) {
      segs.push({
        label: 'Other Vehicles',
        value: rest,
        displayValue: formatCurrency(rest),
        percent: totalCost > 0 ? Math.round((rest / totalCost) * 100) : 0,
        color: CHART_PALETTE[4],
      });
    }
    return segs;
  }, [logs, totalCost, formatCurrency]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = logs.filter((log) => {
      const plate = log?.vehicle?.licensePlate || '';
      const tech = log?.technician?.username || '';
      if (vehicleFilter !== 'ALL' && plate !== vehicleFilter) return false;
      if (techFilter !== 'ALL' && tech !== techFilter) return false;
      if (!q) return true;
      return (
        plate.toLowerCase().includes(q) ||
        String(log?.vehicle?.model || '').toLowerCase().includes(q) ||
        tech.toLowerCase().includes(q) ||
        String(log?.description || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a?.serviceDate || 0) - new Date(b?.serviceDate || 0);
      }
      if (sortBy === 'cost_desc') {
        return (Number(b?.cost) || 0) - (Number(a?.cost) || 0);
      }
      if (sortBy === 'cost_asc') {
        return (Number(a?.cost) || 0) - (Number(b?.cost) || 0);
      }
      return new Date(b?.serviceDate || 0) - new Date(a?.serviceDate || 0);
    });
  }, [logs, searchQuery, vehicleFilter, techFilter, sortBy]);

  const handleLogCreated = async () => {
    setShowForm(false);
    const msg = 'Maintenance record logged successfully.';
    setNotice(msg);
    if (typeof notify === 'function') {
      notify(msg, 'success');
    }
    window.setTimeout(() => setNotice(''), 3500);
    await fetchLogs();
  };

  if (!canViewMaintenance) {
    return (
      <main className="ff-page">
        <PageHeader
          eyebrow="FLEET MAINTENANCE"
          title="Maintenance Logs"
          subtitle="Track vehicle servicing history, assigned technicians, mileage at service, and actual expenditure."
        />
        <section className="ff-card">
          <UnavailableState
            title="Maintenance Access Restricted"
            description="Maintenance logs (/api/maintenance) are restricted to Fleet Manager and Maintenance Technician roles."
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
    <main className="ff-page maintenance-page">
      <PageHeader
        eyebrow="FLEET MAINTENANCE"
        title="Maintenance Logs"
        subtitle="Track actual vehicle service records, technician assignments, service odometer readings, and maintenance expenditure."
        actions={
          <>
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshIcon size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canManageMaintenance ? (
              <button
                type="button"
                className="ff-btn ff-btn-primary"
                onClick={() => setShowForm(true)}
              >
                <PlusIcon size={16} />
                <span>Log Maintenance</span>
              </button>
            ) : null}
          </>
        }
      />

      {/* KPI Strip */}
      <section className="ff-grid-4" style={{ marginBottom: 20 }} aria-label="Maintenance statistics">
        <KpiCard
          label="Total Service Logs"
          value={logs.length}
          caption="Recorded maintenance events"
          icon={<WrenchIcon size={20} />}
          tone="blue"
        />
        <KpiCard
          label="Vehicles Serviced"
          value={vehiclesServiced}
          caption="Unique fleet vehicles"
          icon={<TruckIcon size={20} />}
          tone="cyan"
        />
        <KpiCard
          label="Total Expenditure"
          value={formatCurrency(totalCost)}
          caption="Actual service records"
          icon={<FuelIcon size={20} />}
          tone="purple"
        />
        <KpiCard
          label="Avg. Cost / Service"
          value={logs.length > 0 ? formatCurrency(avgCost) : 'Not Available'}
          caption={logs.length > 0 ? 'Mean across logged services' : 'No records logged'}
          icon={<AnalyticsIcon size={20} />}
          tone="amber"
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
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* Cost Breakdown Summary Card */}
      {logs.length > 0 && costSegments.length > 0 ? (
        <section className="ff-card" style={{ marginBottom: 20 }}>
          <div className="ff-card-header" style={{ marginBottom: 14 }}>
            <div className="ff-card-title-row">
              <span
                className="ff-card-icon"
                style={{
                  background: 'var(--ff-purple-bg)',
                  color: '#a78bfa',
                  borderColor: 'var(--ff-purple-border)',
                }}
              >
                <AnalyticsIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Maintenance Spend by Vehicle</h2>
                <p className="ff-card-subtitle">
                  Aggregated strictly from actual recorded service logs
                </p>
              </div>
            </div>
          </div>

          <div className="ff-expense-body">
            <DonutChart
              segments={costSegments}
              centerValue={formatCurrency(totalCost)}
              centerLabel="Total Spend"
              size={146}
              strokeWidth={14}
            />
            <div className="ff-expense-legend" style={{ maxWidth: 460 }}>
              {costSegments.map((seg) => (
                <div key={seg.label} className="ff-expense-legend-row">
                  <span className="ff-expense-legend-name">
                    <span
                      style={{
                        width: 9,
                        height: 9,
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
        </section>
      ) : null}

      {/* Service Records Table Card */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <WrenchIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Service Records</h2>
              <p className="ff-card-subtitle ff-tabular">
                {filteredLogs.length} of {logs.length} maintenance{' '}
                {logs.length === 1 ? 'record' : 'records'} displayed
              </p>
            </div>
          </div>
        </div>

        <DataTableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search plate, technician, or service work..."
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'date_desc', label: 'Sort: Newest Date' },
            { value: 'date_asc', label: 'Sort: Oldest Date' },
            { value: 'cost_desc', label: 'Sort: Highest Cost' },
            { value: 'cost_asc', label: 'Sort: Lowest Cost' },
          ]}
          rightActions={
            <>
              <select
                className="ff-select"
                style={{ width: 'auto', minWidth: 145 }}
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                aria-label="Filter by vehicle"
              >
                <option value="ALL">All Vehicles</option>
                {vehicleOptions.map((plate) => (
                  <option key={plate} value={plate}>
                    {plate}
                  </option>
                ))}
              </select>

              <select
                className="ff-select"
                style={{ width: 'auto', minWidth: 145 }}
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                aria-label="Filter by technician"
              >
                <option value="ALL">All Technicians</option>
                {techOptions.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </>
          }
        />

        {loading && logs.length === 0 ? (
          <LoadingState
            title="Loading maintenance logs..."
            description="Fetching vehicle servicing history from /api/maintenance."
          />
        ) : error && logs.length === 0 ? (
          <ErrorState
            title="Unable to load maintenance records"
            description={error}
            onRetry={fetchLogs}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={22} />}
            title="No Maintenance Records"
            description="There are no vehicle maintenance records logged yet."
            action={
              canManageMaintenance ? (
                <button
                  type="button"
                  className="ff-btn ff-btn-primary ff-btn-sm"
                  onClick={() => setShowForm(true)}
                >
                  Log First Service
                </button>
              ) : null
            }
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={22} />}
            title="No matching records"
            description="No service records match your current search or filter selection."
            action={
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setVehicleFilter('ALL');
                  setTechFilter('ALL');
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
                  <th>Technician</th>
                  <th>Description</th>
                  <th>Mileage at Service</th>
                  <th>Cost</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const mileage = log?.mileageAtService;
                  const hasMileage =
                    mileage !== null && mileage !== undefined && Number.isFinite(Number(mileage));

                  return (
                    <tr key={log.id}>
                      <td className="ff-tabular" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(log.serviceDate)}
                      </td>

                      <td>
                        <div className="ff-cell-primary">
                          <span className="ff-cell-icon">
                            <TruckIcon size={15} />
                          </span>
                          <div className="ff-cell-stack">
                            <span className="ff-cell-title">
                              {log.vehicle?.licensePlate || 'Unknown'}
                            </span>
                            <span className="ff-cell-sub">
                              {log.vehicle?.model || '—'}
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
                            {(log.technician?.username || 'T').charAt(0).toUpperCase()}
                          </span>
                          <span>{log.technician?.username || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td style={{ color: 'var(--ff-text-secondary)', maxWidth: 260 }}>
                        {log.description || 'No description'}
                      </td>

                      <td className="ff-tabular">
                        {hasMileage
                          ? `${Number(mileage).toLocaleString('en-IN')} km`
                          : 'Not Available'}
                      </td>

                      <td className="ff-tabular" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatCurrency(log.cost)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="ff-btn ff-btn-ghost ff-btn-sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
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

      {/* Log Maintenance Modal (Single clean Modal — fixes legacy double wrapper) */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        size="md"
      >
        <MaintenanceForm
          onRefresh={handleLogCreated}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      {/* Service Detail Slide-Over Drawer */}
      <Drawer
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        eyebrow="SERVICE RECORD"
        title={selectedLog ? `Maintenance #${selectedLog.id}` : 'Service Details'}
        subtitle={
          selectedLog?.vehicle?.licensePlate
            ? `${selectedLog.vehicle.licensePlate} · ${formatDate(selectedLog.serviceDate)}`
            : 'Maintenance log details'
        }
      >
        {selectedLog ? (
          <div className="ff-detail-grid">
            <div className="ff-detail-item">
              <span className="ff-detail-label">Log ID</span>
              <span className="ff-detail-value ff-tabular">#{selectedLog.id}</span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Service Date</span>
              <span className="ff-detail-value ff-tabular">
                {formatDate(selectedLog.serviceDate)}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Vehicle</span>
              <span className="ff-detail-value">
                {selectedLog.vehicle?.licensePlate || 'Unknown'}
                {selectedLog.vehicle?.model ? ` (${selectedLog.vehicle.model})` : ''}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Technician</span>
              <span className="ff-detail-value">
                {selectedLog.technician?.username || 'Unassigned'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Mileage at Service</span>
              <span className="ff-detail-value ff-tabular">
                {selectedLog.mileageAtService !== null &&
                selectedLog.mileageAtService !== undefined
                  ? `${Number(selectedLog.mileageAtService).toLocaleString('en-IN')} km`
                  : 'Not Available'}
              </span>
            </div>
            <div className="ff-detail-item">
              <span className="ff-detail-label">Service Cost</span>
              <span className="ff-detail-value ff-tabular">
                {formatCurrency(selectedLog.cost)}
              </span>
            </div>
            <div className="ff-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ff-detail-label">Work Performed</span>
              <span className="ff-detail-value" style={{ fontWeight: 500, lineHeight: 1.55 }}>
                {selectedLog.description || 'No description provided.'}
              </span>
            </div>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
