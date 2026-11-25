import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import userService from '../../services/userService';
import {
  DEFAULT_PREFERENCES,
  formatCurrencyValue,
  usePreferences,
} from '../../context/PreferencesContext';
import {
  formatRoleLabel,
  getPermissions,
  resolveUsername,
  resolveUserRole,
} from '../../utils/roleUtils';
import { useNotifications } from '../common/NotificationStack';

import PageHeader from '../common/PageHeader';
import DataTableToolbar from '../common/DataTableToolbar';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../common/StateBlocks';
import {
  BellIcon,
  CheckCircleIcon,
  DriversIcon,
  LockIcon,
  MoonIcon,
  RefreshIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from '../common/Icons';

function validateThresholds(draft) {
  const errors = {};
  const polling = Number(draft.pollingIntervalMs);
  const speed = Number(draft.overspeedThreshold);
  const fuel = Number(draft.lowFuelThreshold);
  const mileage = Number(draft.serviceMileageThreshold);

  if (!Number.isFinite(polling) || polling < 3000 || polling > 60000) {
    errors.pollingIntervalMs = 'Enter a polling interval between 3,000 ms and 60,000 ms.';
  }
  if (!Number.isFinite(speed) || speed < 40 || speed > 200) {
    errors.overspeedThreshold = 'Enter an overspeed limit between 40 and 200 km/h.';
  }
  if (!Number.isFinite(fuel) || fuel < 5 || fuel > 50) {
    errors.lowFuelThreshold = 'Enter a low-fuel alert level between 5% and 50%.';
  }
  if (!Number.isFinite(mileage) || mileage < 5000 || mileage > 500000) {
    errors.serviceMileageThreshold = 'Enter a mileage threshold between 5,000 and 500,000 km.';
  }
  return errors;
}

const ROLE_BADGE_MAP = {
  ADMIN: 'ff-badge-danger',
  FLEET_MANAGER: 'ff-badge-info',
  DISPATCHER: 'ff-badge-warning',
  MAINTENANCE_TECH: 'ff-badge-purple',
  DRIVER: 'ff-badge-success',
};

export default function SettingsPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const notify = useNotifications();

  const role = resolveUserRole(authUser);
  const username = resolveUsername(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);

  const [activeTab, setActiveTab] = useState('appearance');

  // Threshold form draft state (validated before persisting)
  const [thresholdDraft, setThresholdDraft] = useState({
    pollingIntervalMs: preferences.pollingIntervalMs,
    overspeedThreshold: preferences.overspeedThreshold,
    lowFuelThreshold: preferences.lowFuelThreshold,
    serviceMileageThreshold: preferences.serviceMileageThreshold,
  });
  const [thresholdErrors, setThresholdErrors] = useState({});

  useEffect(() => {
    setThresholdDraft({
      pollingIntervalMs: preferences.pollingIntervalMs,
      overspeedThreshold: preferences.overspeedThreshold,
      lowFuelThreshold: preferences.lowFuelThreshold,
      serviceMileageThreshold: preferences.serviceMileageThreshold,
    });
  }, [
    preferences.pollingIntervalMs,
    preferences.overspeedThreshold,
    preferences.lowFuelThreshold,
    preferences.serviceMileageThreshold,
  ]);

  // User Directory state (ADMIN & FLEET_MANAGER only)
  const [usersState, setUsersState] = useState({
    items: [],
    status: permissions.canViewUsers ? 'idle' : 'restricted',
    error: null,
  });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!permissions.canViewUsers) {
      setUsersState({ items: [], status: 'restricted', error: null });
      return;
    }
    setUsersState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const res = await userService.getAll();
      const list = Array.isArray(res?.data) ? res.data : [];
      setUsersState({ items: list, status: 'ready', error: null });
    } catch (err) {
      setUsersState({
        items: [],
        status: 'error',
        error: err?.response?.data?.message || err?.message || 'Unable to load user directory.',
      });
    }
  }, [permissions.canViewUsers]);

  useEffect(() => {
    if (activeTab === 'users' && permissions.canViewUsers && usersState.status === 'idle') {
      loadUsers();
    }
  }, [activeTab, permissions.canViewUsers, usersState.status, loadUsers]);

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    const errors = validateThresholds(thresholdDraft);
    setThresholdErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (typeof notify === 'function') {
        notify('Please fix validation errors before saving thresholds.', 'error');
      }
      return;
    }
    updatePreferences({
      pollingIntervalMs: Number(thresholdDraft.pollingIntervalMs),
      overspeedThreshold: Number(thresholdDraft.overspeedThreshold),
      lowFuelThreshold: Number(thresholdDraft.lowFuelThreshold),
      serviceMileageThreshold: Number(thresholdDraft.serviceMileageThreshold),
    });
    if (typeof notify === 'function') {
      notify('Telemetry & alert thresholds saved to browser preferences.', 'success');
    }
  };

  const handleResetAll = () => {
    resetPreferences();
    setThresholdErrors({});
    if (typeof notify === 'function') {
      notify('All workspace preferences reset to FleetFocus defaults (INR, Dark Navy).', 'info');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget || !permissions.canDeleteUsers) return;
    setDeleting(true);
    try {
      await userService.delete(deleteTarget.id);
      if (typeof notify === 'function') {
        notify(`Deleted user "${deleteTarget.username}".`, 'success');
      }
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      if (typeof notify === 'function') {
        notify(
          err?.response?.data?.message || err?.message || 'Unable to delete user.',
          'error'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return usersState.items.filter((u) => {
      const r = String(u?.role || '').toUpperCase();
      if (userRoleFilter !== 'ALL' && r !== userRoleFilter) return false;
      if (!q) return true;
      return (
        String(u?.username || '').toLowerCase().includes(q) ||
        String(u?.email || '').toLowerCase().includes(q) ||
        r.toLowerCase().includes(q)
      );
    });
  }, [usersState.items, userSearch, userRoleFilter]);

  const permissionRows = useMemo(
    () => [
      {
        module: 'Vehicles (/api/vehicles)',
        access: permissions.canManageVehicles ? 'Full Read & Write' : 'Read Only',
        allowed: permissions.canViewVehicles,
      },
      {
        module: 'Trips & Dispatch (/api/trips)',
        access: permissions.canDispatchTrips
          ? 'Dispatch & Fleet History'
          : role === 'DRIVER'
            ? 'Own Trips Only'
            : 'Read Only',
        allowed: permissions.canViewTrips,
      },
      {
        module: 'Live Fleet Telemetry (/api/monitoring/live)',
        access: permissions.canViewLiveFleet ? 'Live Monitoring Access' : 'Restricted by Backend',
        allowed: permissions.canViewLiveFleet,
      },
      {
        module: 'Drivers Directory (/api/drivers)',
        access: permissions.canManageDrivers
          ? 'Full Read & Write'
          : permissions.canViewDrivers
            ? 'Read Only'
            : 'Restricted by Backend',
        allowed: permissions.canViewDrivers,
      },
      {
        module: 'Maintenance & Expense Logs (/api/maintenance)',
        access: permissions.canManageMaintenance ? 'Read & Log Service' : 'Restricted by Backend',
        allowed: permissions.canViewMaintenance,
      },
      {
        module: 'User Directory (/api/users)',
        access: permissions.canDeleteUsers
          ? 'View & Delete Users (ADMIN)'
          : permissions.canViewUsers
            ? 'Read Only (FLEET_MANAGER)'
            : 'Restricted by Backend',
        allowed: permissions.canViewUsers,
      },
    ],
    [permissions, role]
  );

  const hasToken = Boolean(localStorage.getItem('token'));

  return (
    <main className="ff-page">
      <PageHeader
        eyebrow="CONTROL CENTER · SYSTEM CONFIGURATION"
        title="Settings"
        subtitle="Manage workspace appearance, INR/USD currency display, alert thresholds, RBAC permissions, and user directory."
        actions={
          <button
            type="button"
            className="ff-btn ff-btn-secondary"
            onClick={handleResetAll}
          >
            <RefreshIcon size={15} />
            <span>Reset Defaults</span>
          </button>
        }
      />

      {/* Section Navigation Tabs */}
      <div className="ff-settings-tabs" role="tablist" aria-label="Settings sections">
        {[
          { id: 'appearance', label: 'Appearance & Display', icon: <SettingsIcon size={15} /> },
          { id: 'thresholds', label: 'Telemetry & Thresholds', icon: <BellIcon size={15} /> },
          { id: 'account', label: 'Account & Permissions', icon: <ShieldIcon size={15} /> },
          { id: 'users', label: 'User Directory', icon: <DriversIcon size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ff-settings-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Appearance & Display */}
      {activeTab === 'appearance' ? (
        <section className="ff-settings-grid">
          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  {preferences.theme === 'dark' ? <MoonIcon size={17} /> : <SunIcon size={17} />}
                </span>
                <div>
                  <h2 className="ff-card-title">Theme & Visual Density</h2>
                  <p className="ff-card-subtitle">Saved immediately to browser localStorage</p>
                </div>
              </div>
            </div>

            <div className="ff-setting-row">
              <div className="ff-setting-copy">
                <span className="ff-setting-title">Color Theme</span>
                <span className="ff-setting-desc">
                  Choose between the default Dark Navy enterprise theme and Light Enterprise mode.
                </span>
              </div>
              <div className="ff-choice-group" role="group" aria-label="Theme mode">
                <button
                  type="button"
                  className={`ff-choice-btn ${preferences.theme === 'dark' ? 'is-active' : ''}`}
                  onClick={() => updatePreferences({ theme: 'dark' })}
                >
                  <MoonIcon size={14} />
                  <span>Dark Navy</span>
                </button>
                <button
                  type="button"
                  className={`ff-choice-btn ${preferences.theme === 'light' ? 'is-active' : ''}`}
                  onClick={() => updatePreferences({ theme: 'light' })}
                >
                  <SunIcon size={14} />
                  <span>Light</span>
                </button>
              </div>
            </div>

            <div className="ff-setting-row">
              <div className="ff-setting-copy">
                <span className="ff-setting-title">Compact Data Tables</span>
                <span className="ff-setting-desc">
                  Reduces table row padding across Vehicles, Trips, Drivers, Maintenance, and Expenses.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.compactTables}
                aria-label="Toggle compact data tables"
                className={`ff-switch ${preferences.compactTables ? 'is-on' : ''}`}
                onClick={() => updatePreferences({ compactTables: !preferences.compactTables })}
              >
                <span className="ff-switch-thumb" />
              </button>
            </div>

            <div className="ff-setting-row">
              <div className="ff-setting-copy">
                <span className="ff-setting-title">Collapsed Navigation Sidebar</span>
                <span className="ff-setting-desc">
                  Keeps the desktop sidebar in compact icon-rail mode for wider data views.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.sidebarCollapsed}
                aria-label="Toggle collapsed navigation sidebar"
                className={`ff-switch ${preferences.sidebarCollapsed ? 'is-on' : ''}`}
                onClick={() =>
                  updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed })
                }
              >
                <span className="ff-switch-thumb" />
              </button>
            </div>

            <div className="ff-setting-row">
              <div className="ff-setting-copy">
                <span className="ff-setting-title">In-App Toast Notifications</span>
                <span className="ff-setting-desc">
                  Display confirmation alerts for CRUD saves, CSV exports, and acknowledgements.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.notificationsEnabled}
                aria-label="Toggle in-app toast notifications"
                className={`ff-switch ${preferences.notificationsEnabled ? 'is-on' : ''}`}
                onClick={() =>
                  updatePreferences({ notificationsEnabled: !preferences.notificationsEnabled })
                }
              >
                <span className="ff-switch-thumb" />
              </button>
            </div>
          </article>

          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  <SettingsIcon size={17} />
                </span>
                <div>
                  <h2 className="ff-card-title">Regional & Display Currency</h2>
                  <p className="ff-card-subtitle">Default: INR (₹) — formatting only</p>
                </div>
              </div>
            </div>

            <div className="ff-setting-row">
              <div className="ff-setting-copy">
                <span className="ff-setting-title">Display Currency</span>
                <span className="ff-setting-desc">
                  Controls symbol and locale formatting across Dashboard, Maintenance, Fuel & Expenses, and Analytics. Stored backend amounts are never modified.
                </span>
              </div>
              <div className="ff-choice-group" role="group" aria-label="Display currency">
                <button
                  type="button"
                  className={`ff-choice-btn ${preferences.currency === 'INR' ? 'is-active' : ''}`}
                  onClick={() => {
                    updatePreferences({ currency: 'INR' });
                    if (typeof notify === 'function') notify('Display currency set to INR (₹).', 'success');
                  }}
                >
                  <span>INR (₹)</span>
                </button>
                <button
                  type="button"
                  className={`ff-choice-btn ${preferences.currency === 'USD' ? 'is-active' : ''}`}
                  onClick={() => {
                    updatePreferences({ currency: 'USD' });
                    if (typeof notify === 'function') notify('Display currency set to USD ($).', 'success');
                  }}
                >
                  <span>USD ($)</span>
                </button>
              </div>
            </div>

            <div className="ff-rule-list" style={{ marginTop: 14 }}>
              <div className="ff-rule-row">
                <span>Live Formatting Preview (3948)</span>
                <strong className="ff-tabular">
                  {formatCurrencyValue(3948, preferences.currency)}
                </strong>
              </div>
              <div className="ff-rule-row">
                <span>Default Currency</span>
                <strong>{DEFAULT_PREFERENCES.currency} (₹)</strong>
              </div>
              <div className="ff-rule-row">
                <span>Storage Scope</span>
                <strong className="ff-mono">localStorage (browser)</strong>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {/* TAB 2: Telemetry & Alert Thresholds */}
      {activeTab === 'thresholds' ? (
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <BellIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">Telemetry Polling & Alert Thresholds</h2>
                <p className="ff-card-subtitle">
                  Controls Live Fleet polling frequency and operational alert derivation rules
                </p>
              </div>
            </div>
          </div>

          <div className="ff-transparency-banner" role="note" style={{ marginBottom: 18 }}>
            <span className="ff-transparency-icon">
              <ShieldIcon size={17} />
            </span>
            <div>
              <strong>Browser-Local Persistence:</strong> Thresholds and polling cadence are saved
              to <code>fleetfocus_preferences_v1</code> in your browser and immediately applied to
              Dashboard, Live Fleet, Fuel & Expenses, and Alerts Center.
            </div>
          </div>

          <form onSubmit={handleSaveThresholds} noValidate>
            <div className="ff-threshold-form">
              <div className="ff-field">
                <label className="ff-label" htmlFor="pref-polling">
                  Live Telemetry Polling Interval (ms)
                </label>
                <input
                  id="pref-polling"
                  type="number"
                  min={3000}
                  max={60000}
                  step={1000}
                  className="ff-input"
                  value={thresholdDraft.pollingIntervalMs}
                  onChange={(e) =>
                    setThresholdDraft((prev) => ({ ...prev, pollingIntervalMs: e.target.value }))
                  }
                />
                <div className="ff-field-hint">Allowed range: 3,000 – 60,000 ms (Default: 5,000 ms)</div>
                {thresholdErrors.pollingIntervalMs ? (
                  <div className="ff-field-error" role="alert">
                    {thresholdErrors.pollingIntervalMs}
                  </div>
                ) : null}
              </div>

              <div className="ff-field">
                <label className="ff-label" htmlFor="pref-overspeed">
                  Overspeed Critical Alert Limit (km/h)
                </label>
                <input
                  id="pref-overspeed"
                  type="number"
                  min={40}
                  max={200}
                  className="ff-input"
                  value={thresholdDraft.overspeedThreshold}
                  onChange={(e) =>
                    setThresholdDraft((prev) => ({ ...prev, overspeedThreshold: e.target.value }))
                  }
                />
                <div className="ff-field-hint">Allowed range: 40 – 200 km/h (Default: 90 km/h)</div>
                {thresholdErrors.overspeedThreshold ? (
                  <div className="ff-field-error" role="alert">
                    {thresholdErrors.overspeedThreshold}
                  </div>
                ) : null}
              </div>

              <div className="ff-field">
                <label className="ff-label" htmlFor="pref-lowfuel">
                  Low Fuel Warning Threshold (%)
                </label>
                <input
                  id="pref-lowfuel"
                  type="number"
                  min={5}
                  max={50}
                  className="ff-input"
                  value={thresholdDraft.lowFuelThreshold}
                  onChange={(e) =>
                    setThresholdDraft((prev) => ({ ...prev, lowFuelThreshold: e.target.value }))
                  }
                />
                <div className="ff-field-hint">Allowed range: 5% – 50% (Default: 25%)</div>
                {thresholdErrors.lowFuelThreshold ? (
                  <div className="ff-field-error" role="alert">
                    {thresholdErrors.lowFuelThreshold}
                  </div>
                ) : null}
              </div>

              <div className="ff-field">
                <label className="ff-label" htmlFor="pref-mileage">
                  High Mileage Service Check Threshold (km)
                </label>
                <input
                  id="pref-mileage"
                  type="number"
                  min={5000}
                  max={500000}
                  step={1000}
                  className="ff-input"
                  value={thresholdDraft.serviceMileageThreshold}
                  onChange={(e) =>
                    setThresholdDraft((prev) => ({
                      ...prev,
                      serviceMileageThreshold: e.target.value,
                    }))
                  }
                />
                <div className="ff-field-hint">Allowed range: 5,000 – 500,000 km (Default: 40,000 km)</div>
                {thresholdErrors.serviceMileageThreshold ? (
                  <div className="ff-field-error" role="alert">
                    {thresholdErrors.serviceMileageThreshold}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ff-form-actions">
              <button
                type="button"
                className="ff-btn ff-btn-secondary"
                onClick={handleResetAll}
              >
                Reset All Defaults
              </button>
              <button type="submit" className="ff-btn ff-btn-primary">
                <CheckCircleIcon size={15} />
                <span>Save Thresholds</span>
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {/* TAB 3: Account & Role Permissions */}
      {activeTab === 'account' ? (
        <section className="ff-settings-grid">
          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  <LockIcon size={17} />
                </span>
                <div>
                  <h2 className="ff-card-title">Authenticated Session</h2>
                  <p className="ff-card-subtitle">Active JWT identity & Spring Security role</p>
                </div>
              </div>
            </div>

            <div className="ff-profile-banner">
              <div className="ff-profile-avatar">
                {String(username || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ff-text-primary)' }}>
                  {username}
                </div>
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className={`ff-badge ${ROLE_BADGE_MAP[role] || 'ff-badge-neutral'}`}>
                    <span className="ff-badge-dot" />
                    {formatRoleLabel(role)}
                  </span>
                  <span className="ff-badge ff-badge-success">
                    {hasToken ? 'JWT Authenticated' : 'Session Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="ff-rule-list">
              <div className="ff-rule-row">
                <span>Backend Auth Scheme</span>
                <strong>Bearer JWT (Spring Security)</strong>
              </div>
              <div className="ff-rule-row">
                <span>Active Role Claim</span>
                <strong className="ff-mono">{role || 'UNKNOWN'}</strong>
              </div>
              <div className="ff-rule-row">
                <span>Active Display Currency</span>
                <strong>{preferences.currency}</strong>
              </div>
            </div>
          </article>

          <article className="ff-card">
            <div className="ff-card-header">
              <div className="ff-card-title-row">
                <span className="ff-card-icon">
                  <ShieldIcon size={17} />
                </span>
                <div>
                  <h2 className="ff-card-title">Backend RBAC Capability Matrix</h2>
                  <p className="ff-card-subtitle">Enforced by Spring Boot @PreAuthorize rules</p>
                </div>
              </div>
            </div>

            <div className="ff-table-wrap">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>API Domain</th>
                    <th>Access Level</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionRows.map((row) => (
                    <tr key={row.module}>
                      <td style={{ fontWeight: 600 }}>{row.module}</td>
                      <td>
                        <span
                          className={`ff-badge ${row.allowed ? 'ff-badge-success' : 'ff-badge-neutral'}`}
                        >
                          <span className="ff-badge-dot" />
                          {row.access}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {/* TAB 4: User Directory (ADMIN & FLEET_MANAGER only) */}
      {activeTab === 'users' ? (
        <article className="ff-card">
          <div className="ff-card-header">
            <div className="ff-card-title-row">
              <span className="ff-card-icon">
                <DriversIcon size={17} />
              </span>
              <div>
                <h2 className="ff-card-title">User Directory</h2>
                <p className="ff-card-subtitle">
                  {usersState.status === 'ready'
                    ? `${filteredUsers.length} of ${usersState.items.length} registered accounts (/api/users)`
                    : 'Registered platform accounts from /api/users'}
                </p>
              </div>
            </div>
            {permissions.canViewUsers ? (
              <button
                type="button"
                className="ff-btn ff-btn-secondary ff-btn-sm"
                onClick={loadUsers}
                disabled={usersState.status === 'loading'}
              >
                <RefreshIcon size={14} />
                <span>Refresh Users</span>
              </button>
            ) : null}
          </div>

          {!permissions.canViewUsers ? (
            <UnavailableState
              title="User Directory Restricted"
              description="Viewing platform accounts (/api/users) is restricted to ADMIN and FLEET_MANAGER roles by Spring Boot security rules."
            />
          ) : usersState.status === 'loading' || usersState.status === 'idle' ? (
            <LoadingState
              title="Loading user directory..."
              description="Fetching registered accounts from /api/users."
            />
          ) : usersState.status === 'error' ? (
            <ErrorState
              title="Unable to Load Users"
              description={usersState.error}
              onRetry={loadUsers}
            />
          ) : usersState.items.length === 0 ? (
            <EmptyState
              icon={<DriversIcon size={22} />}
              title="No Users Returned"
              description="No user accounts were returned by /api/users."
            />
          ) : (
            <>
              {!permissions.canDeleteUsers ? (
                <div className="ff-transparency-banner" role="note" style={{ marginBottom: 14 }}>
                  <span className="ff-transparency-icon">
                    <LockIcon size={16} />
                  </span>
                  <div>
                    <strong>Read-Only Directory:</strong> You are signed in as{' '}
                    <strong>{formatRoleLabel(role)}</strong>. Deleting accounts (
                    <code>DELETE /api/users/:id</code>) is restricted strictly to the{' '}
                    <strong>ADMIN</strong> role.
                  </div>
                </div>
              ) : null}

              <DataTableToolbar
                searchValue={userSearch}
                onSearchChange={setUserSearch}
                searchPlaceholder="Search username, email, or role..."
                rightActions={
                  <select
                    className="ff-select"
                    style={{ width: 'auto', minWidth: 155 }}
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    aria-label="Filter users by role"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="FLEET_MANAGER">FLEET MANAGER</option>
                    <option value="DISPATCHER">DISPATCHER</option>
                    <option value="MAINTENANCE_TECH">MAINTENANCE TECH</option>
                    <option value="DRIVER">DRIVER</option>
                  </select>
                }
              />

              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={<DriversIcon size={20} />}
                  title="No Matching Accounts"
                  description="No user accounts match your current search or role filter."
                  action={
                    <button
                      type="button"
                      className="ff-btn ff-btn-secondary ff-btn-sm"
                      onClick={() => {
                        setUserSearch('');
                        setUserRoleFilter('ALL');
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
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        {permissions.canDeleteUsers ? (
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const r = String(u?.role || '').toUpperCase();
                        const isSelf =
                          String(u?.username || '').toLowerCase() ===
                          String(username || '').toLowerCase();
                        return (
                          <tr key={u.id}>
                            <td className="ff-mono ff-tabular">#{u.id}</td>
                            <td>
                              <strong>{u.username}</strong>
                              {isSelf ? (
                                <span
                                  className="ff-badge ff-badge-info"
                                  style={{ marginLeft: 8 }}
                                >
                                  You
                                </span>
                              ) : null}
                            </td>
                            <td style={{ color: 'var(--ff-text-secondary)' }}>
                              {u.email || 'Not Available'}
                            </td>
                            <td>
                              <span className={`ff-badge ${ROLE_BADGE_MAP[r] || 'ff-badge-neutral'}`}>
                                <span className="ff-badge-dot" />
                                {formatRoleLabel(r)}
                              </span>
                            </td>
                            {permissions.canDeleteUsers ? (
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="ff-btn ff-btn-danger ff-btn-sm"
                                  disabled={isSelf}
                                  onClick={() => setDeleteTarget(u)}
                                >
                                  Delete
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </article>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User Account"
        message={
          deleteTarget
            ? `Permanently delete user "${deleteTarget.username}" (${formatRoleLabel(deleteTarget.role)})? This calls DELETE /api/users/${deleteTarget.id} and cannot be undone.`
            : ''
        }
        confirmLabel="Delete User"
        tone="danger"
        loading={deleting}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
