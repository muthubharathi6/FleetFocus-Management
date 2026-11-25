import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../../context/PreferencesContext';
import { WrenchIcon } from '../common/Icons';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks';

function formatServiceDate(raw) {
  if (!raw) return 'Not Available';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Not Available';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function UpcomingMaintenanceCard({
  maintenanceLogs = [],
  maintenanceStatus = 'restricted',
  maintenanceError = null,
  vehicles = [],
  vehiclesStatus = 'ready',
  serviceMileageThreshold = 40000,
  onRetry,
}) {
  const navigate = useNavigate();
  const { formatCurrency } = usePreferences();

  const recentLogs = useMemo(() => {
    return [...maintenanceLogs]
      .sort((a, b) => new Date(b?.serviceDate || 0) - new Date(a?.serviceDate || 0))
      .slice(0, 5);
  }, [maintenanceLogs]);

  const flaggedVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const isMaint = String(v?.status || '').toUpperCase() === 'UNDER_MAINTENANCE';
      const highMileage = Number(v?.currentMileage) >= serviceMileageThreshold;
      return isMaint || highMileage;
    });
  }, [vehicles, serviceMileageThreshold]);

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span
            className="ff-card-icon"
            style={{
              background: 'var(--ff-warning-bg)',
              color: 'var(--ff-warning)',
              borderColor: 'var(--ff-warning-border)',
            }}
          >
            <WrenchIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">
              {maintenanceStatus === 'restricted'
                ? 'Vehicles Requiring Attention'
                : 'Recent Maintenance Activity'}
            </h2>
            <p className="ff-card-subtitle">
              {maintenanceStatus === 'restricted'
                ? 'Vehicles marked under maintenance or above service mileage threshold'
                : 'Latest recorded service logs from backend'}
            </p>
          </div>
        </div>

        {maintenanceStatus !== 'restricted' ? (
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => navigate('/maintenance')}
          >
            View All →
          </button>
        ) : null}
      </div>

      {maintenanceStatus === 'loading' || (maintenanceStatus === 'restricted' && vehiclesStatus === 'loading') ? (
        <LoadingState title="Loading maintenance..." description="Fetching service records from backend." />
      ) : maintenanceStatus === 'error' ? (
        <ErrorState
          title="Maintenance Logs Unavailable"
          description={maintenanceError || 'Unable to load /api/maintenance.'}
          onRetry={onRetry}
        />
      ) : maintenanceStatus === 'restricted' ? (
        flaggedVehicles.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={20} />}
            title="No Vehicles Flagged"
            description="No vehicles are currently marked under maintenance or above the service mileage threshold. Detailed maintenance logs are restricted to Fleet Manager & Maintenance Tech roles."
          />
        ) : (
          <div className="ff-table-wrap">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Model</th>
                  <th>Mileage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {flaggedVehicles.slice(0, 5).map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700 }}>{v.licensePlate || '—'}</td>
                    <td>{v.model || '—'}</td>
                    <td className="ff-tabular">
                      {Number.isFinite(Number(v.currentMileage))
                        ? `${Number(v.currentMileage).toLocaleString('en-IN')} km`
                        : 'Not Available'}
                    </td>
                    <td>
                      <span
                        className={`ff-badge ${
                          String(v.status).toUpperCase() === 'UNDER_MAINTENANCE'
                            ? 'ff-badge-warning'
                            : 'ff-badge-info'
                        }`}
                      >
                        <span className="ff-badge-dot" />
                        {String(v.status).toUpperCase() === 'UNDER_MAINTENANCE'
                          ? 'In Maintenance'
                          : 'High Mileage'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : recentLogs.length === 0 ? (
        <EmptyState
          icon={<WrenchIcon size={20} />}
          title="No Maintenance Logs Yet"
          description="Log a vehicle service record to track maintenance history and costs."
          action={
            <button
              type="button"
              className="ff-btn ff-btn-primary ff-btn-sm"
              onClick={() => navigate('/maintenance')}
            >
              Open Maintenance
            </button>
          }
        />
      ) : (
        <div className="ff-table-wrap">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Description</th>
                <th>Service Date</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 700 }}>
                    {log?.vehicle?.licensePlate || 'Unknown'}
                  </td>
                  <td style={{ color: 'var(--ff-text-secondary)' }}>
                    {log?.description || 'Service recorded'}
                  </td>
                  <td className="ff-tabular">{formatServiceDate(log?.serviceDate)}</td>
                  <td className="ff-tabular" style={{ fontWeight: 700 }}>
                    {formatCurrency(log?.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
