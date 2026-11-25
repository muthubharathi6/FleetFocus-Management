import React from 'react';
import { formatRoleLabel } from '../../utils/roleUtils';
import { RefreshIcon } from '../common/Icons';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardHero({
  username = 'User',
  role,
  loading = false,
  lastSyncedAt = null,
  totalVehicles = 0,
  activeTrips = 0,
  alertCount = 0,
  onRefresh,
}) {
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : 'User';

  const syncedLabel = lastSyncedAt
    ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : loading
      ? 'Syncing live backend data...'
      : 'Awaiting sync';

  return (
    <section className="ff-dash-hero" aria-label="Dashboard overview header">
      <div className="ff-dash-hero-copy">
        <div className="ff-eyebrow">
          <span>OPERATIONAL COMMAND</span>
          {role ? (
            <span className="ff-badge ff-badge-info" style={{ marginLeft: 6, padding: '2px 8px', fontSize: 10 }}>
              {formatRoleLabel(role)}
            </span>
          ) : null}
        </div>

        <h1 className="ff-dash-hero-title">
          {getTimeGreeting()}, <span className="ff-dash-hero-accent">{displayName}</span>
        </h1>

        <p className="ff-dash-hero-sub">
          Live operational snapshot powered directly by your FleetFocus backend services.
        </p>

        <div className="ff-dash-hero-pills">
          <span className="ff-badge ff-badge-info ff-tabular">
            <span className="ff-badge-dot" />
            {totalVehicles} Fleet {totalVehicles === 1 ? 'Vehicle' : 'Vehicles'}
          </span>
          <span className="ff-badge ff-badge-success ff-tabular">
            <span className="ff-badge-dot" />
            {activeTrips} Active {activeTrips === 1 ? 'Trip' : 'Trips'}
          </span>
          {alertCount > 0 ? (
            <span className="ff-badge ff-badge-warning ff-tabular">
              <span className="ff-badge-dot" />
              {alertCount} Derived {alertCount === 1 ? 'Alert' : 'Alerts'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="ff-dash-hero-actions">
        {onRefresh ? (
          <button
            type="button"
            className="ff-btn ff-btn-secondary ff-btn-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshIcon size={14} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        ) : null}
        <span className="ff-dash-sync-meta">{syncedLabel}</span>
      </div>
    </section>
  );
}
