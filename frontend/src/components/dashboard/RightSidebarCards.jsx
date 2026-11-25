import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AnalyticsIcon,
  CheckCircleIcon,
  DriversIcon,
  FuelIcon,
  RouteIcon,
  ShieldIcon,
  TruckIcon,
} from '../common/Icons';

export default function RightSidebarCards({
  role,
  permissions = {},
  vehicles = [],
  totalVehicleCount,
  trips = [],
  drivers = [],
  driversStatus = 'restricted',
  maintenanceLogs = [],
  maintenanceStatus = 'restricted',
  liveFleet = [],
  liveStatus = 'restricted',
  loading = false,
  serviceMileageThreshold = 40000,
}) {
  const navigate = useNavigate();
  const { formatCurrency } = usePreferences();

  const totalVehicles =
    typeof totalVehicleCount === 'number' ? totalVehicleCount : vehicles.length;
  const availableVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'AVAILABLE'
  ).length;
  const onTripVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'ON_TRIP'
  ).length;
  const maintVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'UNDER_MAINTENANCE'
  ).length;

  const totalDistance = trips.reduce(
    (sum, t) => sum + (Number(t?.distanceCovered) || 0),
    0
  );
  const totalMaintenanceSpend = maintenanceLogs.reduce(
    (sum, m) => sum + (Number(m?.cost) || 0),
    0
  );

  // Strictly data-driven operational insights — zero fabricated trends or claims
  const insights = useMemo(() => {
    const list = [];
    const isDriver = String(role || '').toUpperCase() === 'DRIVER';

    if (totalVehicles > 0) {
      const util = Math.round((onTripVehicles / totalVehicles) * 100);
      list.push(
        `${onTripVehicles} of ${totalVehicles} fleet vehicles are currently on trip (${util}% utilization).`
      );
      list.push(
        `${availableVehicles} ${availableVehicles === 1 ? 'vehicle is' : 'vehicles are'} available for dispatch.`
      );
    }

    if (maintVehicles > 0) {
      list.push(
        `${maintVehicles} ${maintVehicles === 1 ? 'vehicle is' : 'vehicles are'} currently under maintenance.`
      );
    }

    const highMileageCount = vehicles.filter(
      (v) => Number(v?.currentMileage) >= serviceMileageThreshold
    ).length;
    if (highMileageCount > 0) {
      list.push(
        `${highMileageCount} ${highMileageCount === 1 ? 'vehicle exceeds' : 'vehicles exceed'} the ${serviceMileageThreshold.toLocaleString('en-IN')} km service mileage threshold.`
      );
    }

    if (isDriver) {
      const activeCount = trips.filter((t) => String(t?.status).toUpperCase() === 'ACTIVE').length;
      const completedCount = trips.filter((t) => String(t?.status).toUpperCase() === 'COMPLETED').length;
      list.push(
        `Your account shows ${activeCount} active and ${completedCount} completed trips (${totalDistance.toFixed(1)} km logged).`
      );
    } else if (maintenanceStatus === 'ready' && maintenanceLogs.length > 0) {
      list.push(
        `Recorded maintenance spend totals ${formatCurrency(totalMaintenanceSpend)} across ${maintenanceLogs.length} ${maintenanceLogs.length === 1 ? 'log' : 'logs'}.`
      );
    }

    if (liveStatus === 'ready') {
      const gpsCount = liveFleet.filter(
        (v) => v?.latitude !== null && v?.latitude !== undefined && v?.longitude !== null && v?.longitude !== undefined
      ).length;
      if (liveFleet.length > 0) {
        list.push(
          `${gpsCount} of ${liveFleet.length} monitored vehicles currently report live GPS coordinates.`
        );
      }
    }

    return list.slice(0, 5);
  }, [
    role,
    totalVehicles,
    onTripVehicles,
    availableVehicles,
    maintVehicles,
    vehicles,
    serviceMileageThreshold,
    trips,
    totalDistance,
    maintenanceStatus,
    maintenanceLogs.length,
    totalMaintenanceSpend,
    formatCurrency,
    liveStatus,
    liveFleet,
  ]);

  const summaryRows = [
    {
      label: 'Total Vehicles',
      value: String(totalVehicles),
      icon: <TruckIcon size={15} />,
    },
    {
      label: 'Registered Drivers',
      value:
        driversStatus === 'ready'
          ? String(drivers.length)
          : driversStatus === 'restricted'
            ? 'Restricted'
            : driversStatus === 'error'
              ? 'Unavailable'
              : '...',
      icon: <DriversIcon size={15} />,
    },
    {
      label: String(role || '').toUpperCase() === 'DRIVER' ? 'Your Trips' : 'Total Trips',
      value: String(trips.length),
      icon: <RouteIcon size={15} />,
    },
    {
      label: 'Logged Distance',
      value: `${totalDistance.toFixed(1)} km`,
      icon: <AnalyticsIcon size={15} />,
    },
    {
      label: 'Maintenance Spend',
      value:
        maintenanceStatus === 'ready'
          ? formatCurrency(totalMaintenanceSpend)
          : maintenanceStatus === 'restricted'
            ? 'Restricted'
            : maintenanceStatus === 'error'
              ? 'Unavailable'
              : '...',
      icon: <FuelIcon size={15} />,
    },
  ];

  const quickLinks = [
    { title: 'Vehicle Inventory', path: '/vehicles', visible: permissions.canViewVehicles !== false },
    { title: 'Trip History & Dispatch', path: '/trips', visible: permissions.canViewTrips !== false },
    { title: 'Driver Directory', path: '/drivers', visible: Boolean(permissions.canViewDrivers) },
    { title: 'Maintenance History', path: '/maintenance', visible: Boolean(permissions.canViewMaintenance) },
    { title: 'Fuel & Expenses', path: '/expenses', visible: true },
    { title: 'Analytics & Reports', path: '/analytics', visible: true },
  ].filter((link) => link.visible);

  return (
    <aside className="ff-dash-rail" aria-label="Fleet intelligence and summary">
      {/* 1. Data-Driven Operational Insights */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <ShieldIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Operational Insights</h2>
              <p className="ff-card-subtitle">Computed from live API data</p>
            </div>
          </div>
        </div>

        {loading && insights.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ff-text-muted)' }}>
            Analyzing live backend records...
          </p>
        ) : insights.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ff-text-muted)' }}>
            No operational insights available yet. Add vehicles or trips to generate live summaries.
          </p>
        ) : (
          <div className="ff-insight-list">
            {insights.map((text, idx) => (
              <div key={idx} className="ff-insight-row">
                <span className="ff-insight-bullet" aria-hidden="true">
                  <CheckCircleIcon size={15} />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Fleet Summary */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <AnalyticsIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Fleet Summary</h2>
              <p className="ff-card-subtitle">Verified backend totals</p>
            </div>
          </div>
        </div>

        <div className="ff-summary-list">
          {summaryRows.map((row) => (
            <div key={row.label} className="ff-summary-row">
              <span className="ff-summary-label">
                {row.icon}
                <span>{row.label}</span>
              </span>
              <span className="ff-summary-value">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Quick Links */}
      <section className="ff-card">
        <div className="ff-card-header">
          <div className="ff-card-title-row">
            <span className="ff-card-icon">
              <RouteIcon size={17} />
            </span>
            <div>
              <h2 className="ff-card-title">Quick Navigation</h2>
              <p className="ff-card-subtitle">Direct module access</p>
            </div>
          </div>
        </div>

        <div className="ff-quicklink-list">
          {quickLinks.map((item) => (
            <button
              key={item.path}
              type="button"
              className="ff-quicklink-btn"
              onClick={() => navigate(item.path)}
            >
              <span>{item.title}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
