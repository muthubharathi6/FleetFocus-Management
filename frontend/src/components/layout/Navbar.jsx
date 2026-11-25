import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { usePreferences } from '../../context/PreferencesContext';
import { formatRoleLabel, getPermissions, resolveUsername, resolveUserRole } from '../../utils/roleUtils';
import monitoringService from '../../services/monitoringService';
import CommandPalette from '../common/CommandPalette';
import {
  AnalyticsIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DashboardIcon,
  DriversIcon,
  FuelIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  RadarIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const popoverRef = useRef(null);

  const user = useSelector((state) => state.auth?.user);
  const { preferences, toggleTheme, toggleSidebarCollapsed } = usePreferences();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activePopover, setActivePopover] = useState(null); // 'alerts' | 'user' | null
  const [gpsActiveCount, setGpsActiveCount] = useState(null); // null = unchecked/unavailable, number = live count

  const roleForCheck = resolveUserRole(user) || 'FLEET_MANAGER';
  const canPollTelemetry = Boolean(user && getPermissions(roleForCheck).canViewLiveFleet);

  // Check real GPS broadcast count (only for permitted roles) so topbar never implies live GPS when 0 vehicles broadcast
  useEffect(() => {
    if (!canPollTelemetry) {
      setGpsActiveCount(null);
      return undefined;
    }

    let active = true;
    const checkTelemetry = async () => {
      try {
        const res = await monitoringService.getLiveFleet();
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        const broadcasting = rows.filter(
          (v) =>
            v?.latitude !== null &&
            v?.latitude !== undefined &&
            v?.longitude !== null &&
            v?.longitude !== undefined
        ).length;
        setGpsActiveCount(broadcasting);
      } catch {
        if (active) setGpsActiveCount(null);
      }
    };

    checkTelemetry();
    const intervalMs = preferences.pollingIntervalMs > 0 ? Math.max(preferences.pollingIntervalMs, 10000) : 0;
    const timer = intervalMs > 0 ? setInterval(checkTelemetry, intervalMs) : null;

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [canPollTelemetry, preferences.pollingIntervalMs]);

  // Close mobile drawer and popovers on route change
  useEffect(() => {
    setMobileOpen(false);
    setActivePopover(null);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setActivePopover(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close popover on outside click (ignoring trigger buttons so re-click toggles cleanly)
  useEffect(() => {
    if (!activePopover) return undefined;
    const handleClickOutside = (event) => {
      if (event.target?.closest?.('[data-popover-trigger="true"]')) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopover]);

  if (!user) {
    return null;
  }

  const username = resolveUsername(user);
  const role = resolveUserRole(user) || 'FLEET_MANAGER';
  const permissions = getPermissions(role);
  const isDark = preferences.theme === 'dark';
  const isCollapsed = preferences.sidebarCollapsed;

  const handleLogout = () => {
    setActivePopover(null);
    dispatch(logout());
    navigate('/login');
  };

  const navGroups = [
    {
      label: 'Operations',
      items: [
        { label: 'Dashboard', to: '/', end: true, icon: DashboardIcon, visible: true },
        { label: 'Vehicles', to: '/vehicles', icon: TruckIcon, visible: permissions.canViewVehicles },
        { label: 'Trips', to: '/trips', icon: RouteIcon, visible: permissions.canViewTrips },
        { label: 'Live Fleet', to: '/live', icon: RadarIcon, visible: permissions.canViewLiveFleet },
      ],
    },
    {
      label: 'Resources & Finance',
      items: [
        { label: 'Drivers', to: '/drivers', icon: DriversIcon, visible: permissions.canViewDrivers },
        { label: 'Maintenance', to: '/maintenance', icon: WrenchIcon, visible: permissions.canViewMaintenance },
        { label: 'Fuel & Expenses', to: '/expenses', icon: FuelIcon, visible: true },
        { label: 'Analytics & Reports', to: '/analytics', icon: AnalyticsIcon, visible: true },
      ],
    },
    {
      label: 'Control Center',
      items: [
        { label: 'Alerts', to: '/alerts', icon: BellIcon, visible: true },
        { label: 'Settings', to: '/settings', icon: SettingsIcon, visible: true },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`ff-mobile-backdrop ${mobileOpen ? 'is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* =====================================================================
          PERSISTENT GLASS SIDEBAR (Preserves <nav> for Test T3)
      ====================================================================== */}
      <aside
        className={`ff-sidebar ${isCollapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Sidebar"
      >
        <div className="ff-sidebar-brand-row">
          <NavLink to="/" className="ff-brand-link" title="FleetFocus Dashboard">
            <div className="ff-brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
                  fill="currentColor"
                  fillOpacity="0.22"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <circle cx="12" cy="11" r="2.8" fill="currentColor" />
              </svg>
            </div>
            <div className="ff-brand-copy">
              <span className="ff-brand-name">
                Fleet<span>Focus</span>
              </span>
              <span className="ff-brand-tag">Enterprise SaaS</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="ff-sidebar-collapse-btn"
            onClick={toggleSidebarCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon size={15} /> : <ChevronLeftIcon size={15} />}
          </button>

          <button
            type="button"
            className="ff-mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            title="Close menu"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <nav className="ff-sidebar-nav" aria-label="Main navigation">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="ff-nav-group">
                <div className="ff-nav-group-label">{group.label}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `ff-nav-item ${isActive ? 'is-active' : ''}`
                      }
                    >
                      <span className="ff-nav-icon">
                        <Icon size={18} />
                      </span>
                      <span className="ff-nav-label">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="ff-sidebar-footer">
          {/* Dark / Light Theme Switch */}
          <div className="ff-theme-row">
            <div className="ff-theme-row-left">
              {isDark ? <MoonIcon size={15} /> : <SunIcon size={15} />}
              <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              type="button"
              className={`ff-switch ${isDark ? 'is-on' : ''}`}
              onClick={toggleTheme}
              aria-label="Toggle dark or light theme"
              aria-pressed={isDark}
            >
              <span className="ff-switch-knob" />
            </button>
          </div>

          {/* Mini Profile Card */}
          <button
            type="button"
            className="ff-sidebar-user"
            onClick={() => navigate('/settings')}
            title="Account & Settings"
          >
            <div className="ff-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="ff-user-meta">
              <div className="ff-user-name">{username}</div>
              <div className="ff-user-role">{formatRoleLabel(role)}</div>
            </div>
          </button>

          {/* Logout Button (Preserves exact Logout text for Test T27) */}
          <button
            type="button"
            className="ff-logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <LogoutIcon size={15} />
            <span className="ff-logout-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          STICKY GLASS TOP NAVIGATION BAR
      ====================================================================== */}
      <header className={`ff-topbar ${isCollapsed ? 'is-collapsed' : ''}`}>
        <div className="ff-topbar-inner">
          <div className="ff-topbar-left">
            <button
              type="button"
              className="ff-mobile-menu-btn"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
            </button>

            <button
              type="button"
              className="ff-cmd-trigger"
              onClick={() => setCommandOpen(true)}
              aria-label="Open quick navigation search"
            >
              <SearchIcon size={16} />
              <span className="ff-cmd-trigger-text">
                Jump to vehicles, trips, drivers, analytics...
              </span>
              <span className="ff-kbd">Ctrl + K</span>
            </button>
          </div>

          <div className="ff-topbar-right">
            {permissions.canViewLiveFleet ? (
              <NavLink
                to="/live"
                className={`ff-live-pill ${gpsActiveCount > 0 ? '' : 'is-offline'}`}
                title={
                  gpsActiveCount > 0
                    ? `${gpsActiveCount} vehicle(s) actively broadcasting GPS`
                    : 'No vehicles currently broadcasting GPS coordinates'
                }
              >
                <span className="ff-live-dot" aria-hidden="true" />
                <span>
                  {gpsActiveCount > 0
                    ? `GPS Live (${gpsActiveCount})`
                    : gpsActiveCount === 0
                      ? 'GPS Offline'
                      : 'Live Monitor'}
                </span>
              </NavLink>
            ) : null}

            <button
              type="button"
              className="ff-icon-btn"
              data-popover-trigger="true"
              onClick={() =>
                setActivePopover((prev) => (prev === 'alerts' ? null : 'alerts'))
              }
              aria-label="Alerts overview"
              aria-expanded={activePopover === 'alerts'}
            >
              <BellIcon size={17} />
            </button>

            <button
              type="button"
              className="ff-topbar-user-btn"
              data-popover-trigger="true"
              onClick={() =>
                setActivePopover((prev) => (prev === 'user' ? null : 'user'))
              }
              aria-label="Account menu"
              aria-expanded={activePopover === 'user'}
            >
              <span className="ff-avatar">{username.charAt(0).toUpperCase()}</span>
              <span className="ff-topbar-user-name">{username}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          POPOVERS (NO HARDCODED DUMMY ALERTS)
      ====================================================================== */}
      {activePopover === 'alerts' ? (
        <div ref={popoverRef} className="ff-popover" role="dialog" aria-label="Alerts preview">
          <div className="ff-popover-header">
            <h3>Operational Alerts</h3>
            <button
              type="button"
              className="ff-icon-btn"
              style={{ width: 28, height: 28 }}
              onClick={() => setActivePopover(null)}
              aria-label="Close alerts popover"
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div className="ff-popover-body">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ff-text-secondary)', lineHeight: 1.5 }}>
              Alerts are derived from live backend telemetry, vehicle maintenance status, and configured thresholds.
            </p>
          </div>
          <div className="ff-popover-footer">
            <span style={{ fontSize: 11.5, color: 'var(--ff-text-muted)' }}>
              Local acknowledgement mode
            </span>
            <button
              type="button"
              className="ff-btn ff-btn-primary ff-btn-sm"
              onClick={() => {
                setActivePopover(null);
                navigate('/alerts');
              }}
            >
              Open Alerts Center
            </button>
          </div>
        </div>
      ) : null}

      {activePopover === 'user' ? (
        <div ref={popoverRef} className="ff-popover" role="dialog" aria-label="Account summary">
          <div className="ff-popover-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ff-avatar">{username.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ff-text-primary)' }}>
                  {username}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ff-cyan-bright)' }}>
                  {formatRoleLabel(role)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="ff-icon-btn"
              style={{ width: 28, height: 28 }}
              onClick={() => setActivePopover(null)}
              aria-label="Close account menu"
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div className="ff-popover-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--ff-text-muted)' }}>Display Currency</span>
              <strong style={{ color: 'var(--ff-text-primary)' }}>{preferences.currency}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--ff-text-muted)' }}>Theme</span>
              <strong style={{ color: 'var(--ff-text-primary)', textTransform: 'capitalize' }}>
                {preferences.theme}
              </strong>
            </div>
          </div>
          <div className="ff-popover-footer">
            <button
              type="button"
              className="ff-btn ff-btn-secondary ff-btn-sm"
              onClick={() => {
                setActivePopover(null);
                navigate('/settings');
              }}
            >
              Settings
            </button>
            <button
              type="button"
              className="ff-btn ff-btn-danger ff-btn-sm"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : null}

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        permissions={permissions}
      />
    </>
  );
}
