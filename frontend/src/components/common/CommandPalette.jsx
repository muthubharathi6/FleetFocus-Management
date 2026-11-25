import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AnalyticsIcon,
  BellIcon,
  DashboardIcon,
  DriversIcon,
  FuelIcon,
  RadarIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  TruckIcon,
  WrenchIcon,
} from './Icons';

const ALL_COMMANDS = [
  { label: 'Dashboard', path: '/', category: 'Overview', keywords: 'home summary kpi overview', icon: DashboardIcon },
  { label: 'Vehicles', path: '/vehicles', category: 'Fleet', keywords: 'inventory trucks fleet vin plate', icon: TruckIcon },
  { label: 'Trips', path: '/trips', category: 'Operations', keywords: 'dispatch journey routes active', icon: RouteIcon },
  { label: 'Live Fleet', path: '/live', category: 'Operations', keywords: 'gps telemetry radar monitoring live', icon: RadarIcon, perm: 'canViewLiveFleet' },
  { label: 'Drivers', path: '/drivers', category: 'Fleet', keywords: 'operators license roster', icon: DriversIcon, perm: 'canViewDrivers' },
  { label: 'Maintenance', path: '/maintenance', category: 'Operations', keywords: 'service repair workshop logs', icon: WrenchIcon, perm: 'canViewMaintenance' },
  { label: 'Fuel & Expenses', path: '/expenses', category: 'Finance', keywords: 'cost spend fuel mileage budget', icon: FuelIcon },
  { label: 'Analytics & Reports', path: '/analytics', category: 'Intelligence', keywords: 'charts export csv pdf kpi', icon: AnalyticsIcon },
  { label: 'Alerts', path: '/alerts', category: 'Monitoring', keywords: 'warnings overspeed notifications', icon: BellIcon },
  { label: 'Settings', path: '/settings', category: 'System', keywords: 'theme currency thresholds profile users', icon: SettingsIcon },
];

export default function CommandPalette({ open, onClose, permissions }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_COMMANDS.filter((cmd) => {
      if (cmd.perm && permissions && !permissions[cmd.perm]) {
        return false;
      }
      if (!q) return true;
      return (
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.keywords.toLowerCase().includes(q)
      );
    });
  }, [query, permissions]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
      } else if (event.key === 'Enter' && items[selectedIndex]) {
        event.preventDefault();
        navigate(items[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, items, selectedIndex, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="ff-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="ff-cmd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Navigation"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ff-cmd-input-row">
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            type="text"
            className="ff-cmd-input"
            placeholder="Jump to page or module (e.g. Vehicles, Trips, Drivers, Settings)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search modules"
          />
          <span className="ff-kbd">ESC</span>
        </div>

        <div className="ff-cmd-list" role="listbox">
          {items.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ff-text-muted)', fontSize: 13 }}>
              No matching pages found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  role="option"
                  aria-selected={idx === selectedIndex}
                  className={`ff-cmd-item ${idx === selectedIndex ? 'is-selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <span className="ff-cmd-item-left">
                    <span className="ff-nav-icon">
                      <Icon size={17} />
                    </span>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                  </span>
                  <span className="ff-cmd-item-meta">{item.category}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
