import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AnalyticsIcon,
  DriversIcon,
  RadarIcon,
  RouteIcon,
  TruckIcon,
  WrenchIcon,
} from '../common/Icons';

export default function QuickActionsCard({ permissions = {} }) {
  const navigate = useNavigate();

  const actions = [
    {
      title: permissions.canManageVehicles ? 'Manage Vehicles' : 'View Vehicles',
      subtitle: permissions.canManageVehicles ? 'Add, edit or inspect fleet' : 'Browse fleet inventory',
      icon: <TruckIcon size={18} />,
      tone: 'blue',
      path: '/vehicles',
      visible: permissions.canViewVehicles !== false,
    },
    {
      title: permissions.canDispatchTrips ? 'Dispatch Trip' : 'View Trips',
      subtitle: permissions.canDispatchTrips ? 'Assign vehicle & driver' : 'Track trip records',
      icon: <RouteIcon size={18} />,
      tone: 'emerald',
      path: '/trips',
      visible: permissions.canViewTrips !== false,
    },
    {
      title: 'Live Telemetry',
      subtitle: 'Monitor GPS & speed',
      icon: <RadarIcon size={18} />,
      tone: 'cyan',
      path: '/live',
      visible: Boolean(permissions.canViewLiveFleet),
    },
    {
      title: 'Maintenance',
      subtitle: 'Log & review service',
      icon: <WrenchIcon size={18} />,
      tone: 'amber',
      path: '/maintenance',
      visible: Boolean(permissions.canViewMaintenance),
    },
    {
      title: 'Drivers',
      subtitle: 'Operator directory',
      icon: <DriversIcon size={18} />,
      tone: 'purple',
      path: '/drivers',
      visible: Boolean(permissions.canViewDrivers),
    },
    {
      title: 'Analytics & Reports',
      subtitle: 'Fleet KPIs & exports',
      icon: <AnalyticsIcon size={18} />,
      tone: 'cyan',
      path: '/analytics',
      visible: true,
    },
  ].filter((a) => a.visible).slice(0, 4);

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span className="ff-card-icon">
            <RouteIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Quick Actions</h2>
            <p className="ff-card-subtitle">Role-permitted shortcuts</p>
          </div>
        </div>
      </div>

      <div className="ff-qa-grid">
        {actions.map((action) => (
          <button
            key={action.path}
            type="button"
            className="ff-qa-tile"
            onClick={() => navigate(action.path)}
          >
            <span className={`ff-kpi-icon tone-${action.tone}`} style={{ width: 36, height: 36, borderRadius: 10 }}>
              {action.icon}
            </span>
            <div>
              <div className="ff-qa-title">{action.title}</div>
              <div className="ff-qa-sub">{action.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}
