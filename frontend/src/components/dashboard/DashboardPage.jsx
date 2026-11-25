import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import maintenanceService from '../../services/maintenanceService';
import monitoringService from '../../services/monitoringService';
import driverService from '../../services/driverService';

import { usePreferences } from '../../context/PreferencesContext';
import { getPermissions, resolveUsername, resolveUserRole } from '../../utils/roleUtils';
import { deriveOperationalAlerts } from '../../utils/alertDerivation';

import DashboardHero from './DashboardHero';
import StatCards from './StatCards';
import LiveTrackingCard from './LiveTrackingCard';
import FleetPerformanceCard from './FleetPerformanceCard';
import RecentAlertsCard from './RecentAlertsCard';
import TripOverviewCard from './TripOverviewCard';
import ExpenseOverviewCard from './ExpenseOverviewCard';
import VehicleStatusCard from './VehicleStatusCard';
import UpcomingMaintenanceCard from './UpcomingMaintenanceCard';
import QuickActionsCard from './QuickActionsCard';
import RightSidebarCards from './RightSidebarCards';
import DashboardFooter from './DashboardFooter';

function extractList(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function extractTotalElements(response, list) {
  const total = response?.data?.totalElements;
  return typeof total === 'number' ? total : list.length;
}

function extractErrorMessage(reason, fallback) {
  return (
    reason?.response?.data?.message ||
    (typeof reason?.response?.data === 'string' ? reason.response.data : null) ||
    reason?.message ||
    fallback
  );
}

export default function DashboardPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const { preferences } = usePreferences();

  const role = resolveUserRole(authUser);
  const username = resolveUsername(authUser);
  const permissions = useMemo(() => getPermissions(role), [role]);

  const [state, setState] = useState({
    loading: true,
    lastSyncedAt: null,
    vehicles: { items: [], totalElements: 0, status: 'loading', error: null },
    trips: { items: [], status: 'loading', error: null },
    maintenance: { items: [], status: 'idle', error: null },
    liveFleet: { items: [], status: 'idle', error: null },
    drivers: { items: [], status: 'idle', error: null },
  });

  const loadDashboardData = useCallback(async () => {
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
      drivers: permissions.canViewDrivers
        ? { ...prev.drivers, status: 'loading', error: null }
        : { items: [], status: 'restricted', error: null },
    }));

    const requests = [
      vehicleService.getAll(0, 200),
      tripService.getAll(),
      permissions.canViewMaintenance ? maintenanceService.getAll() : Promise.resolve(null),
      permissions.canViewLiveFleet ? monitoringService.getLiveFleet() : Promise.resolve(null),
      permissions.canViewDrivers ? driverService.getAll() : Promise.resolve(null),
    ];

    const [vRes, tRes, mRes, lRes, dRes] = await Promise.allSettled(requests);

    const nextVehicles =
      vRes.status === 'fulfilled'
        ? (() => {
            const items = extractList(vRes.value);
            return {
              items,
              totalElements: extractTotalElements(vRes.value, items),
              status: 'ready',
              error: null,
            };
          })()
        : {
            items: [],
            totalElements: 0,
            status: 'error',
            error: extractErrorMessage(vRes.reason, 'Failed to load vehicles.'),
          };

    const nextTrips =
      tRes.status === 'fulfilled'
        ? { items: extractList(tRes.value), status: 'ready', error: null }
        : {
            items: [],
            status: 'error',
            error: extractErrorMessage(tRes.reason, 'Failed to load trips.'),
          };

    const nextMaintenance = !permissions.canViewMaintenance
      ? { items: [], status: 'restricted', error: null }
      : mRes.status === 'fulfilled'
        ? { items: extractList(mRes.value), status: 'ready', error: null }
        : {
            items: [],
            status: 'error',
            error: extractErrorMessage(mRes.reason, 'Failed to load maintenance logs.'),
          };

    const nextLiveFleet = !permissions.canViewLiveFleet
      ? { items: [], status: 'restricted', error: null }
      : lRes.status === 'fulfilled'
        ? { items: extractList(lRes.value), status: 'ready', error: null }
        : {
            items: [],
            status: 'error',
            error: extractErrorMessage(lRes.reason, 'Failed to load live fleet telemetry.'),
          };

    const nextDrivers = !permissions.canViewDrivers
      ? { items: [], status: 'restricted', error: null }
      : dRes.status === 'fulfilled'
        ? { items: extractList(dRes.value), status: 'ready', error: null }
        : {
            items: [],
            status: 'error',
            error: extractErrorMessage(dRes.reason, 'Failed to load drivers.'),
          };

    setState({
      loading: false,
      lastSyncedAt: new Date(),
      vehicles: nextVehicles,
      trips: nextTrips,
      maintenance: nextMaintenance,
      liveFleet: nextLiveFleet,
      drivers: nextDrivers,
    });
  }, [permissions]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const derivedAlerts = useMemo(
    () =>
      deriveOperationalAlerts({
        vehicles: state.vehicles.items,
        trips: state.trips.items,
        liveFleet: state.liveFleet.items,
        thresholds: {
          overspeedThreshold: preferences.overspeedThreshold,
          lowFuelThreshold: preferences.lowFuelThreshold,
          serviceMileageThreshold: preferences.serviceMileageThreshold,
        },
      }),
    [
      state.vehicles.items,
      state.trips.items,
      state.liveFleet.items,
      preferences.overspeedThreshold,
      preferences.lowFuelThreshold,
      preferences.serviceMileageThreshold,
    ]
  );

  return (
    <main className="ff-dashboard" aria-label="FleetFocus Dashboard">
      <div className="ff-dash-layout">
        {/* Main Primary Column */}
        <div className="ff-dash-main">
          <DashboardHero
            username={username}
            role={role}
            loading={state.loading}
            lastSyncedAt={state.lastSyncedAt}
            totalVehicles={state.vehicles.totalElements}
            activeTrips={
              state.trips.items.filter((t) => String(t?.status).toUpperCase() === 'ACTIVE').length
            }
            alertCount={derivedAlerts.length}
            onRefresh={loadDashboardData}
          />

          <StatCards
            vehicles={state.vehicles.items}
            totalVehicleCount={state.vehicles.totalElements}
            vehiclesStatus={state.vehicles.status}
            vehiclesError={state.vehicles.error}
            trips={state.trips.items}
            tripsStatus={state.trips.status}
            maintenanceLogs={state.maintenance.items}
            maintenanceStatus={state.maintenance.status}
            role={role}
            onRetry={loadDashboardData}
          />

          {/* Row 1: Live Tracking, Fleet Performance, Recent Alerts */}
          <div className="ff-dash-row-3">
            <LiveTrackingCard
              liveFleet={state.liveFleet.items}
              status={state.liveFleet.status}
              error={state.liveFleet.error}
              overspeedThreshold={preferences.overspeedThreshold}
              onRetry={loadDashboardData}
            />
            <FleetPerformanceCard
              vehicles={state.vehicles.items}
              vehiclesStatus={state.vehicles.status}
              trips={state.trips.items}
              tripsStatus={state.trips.status}
              liveFleet={state.liveFleet.items}
              liveStatus={state.liveFleet.status}
            />
            <RecentAlertsCard
              alerts={derivedAlerts}
              loading={state.loading}
            />
          </div>

          {/* Row 2: Trip Overview, Expense Overview, Vehicle Status */}
          <div className="ff-dash-row-3">
            <TripOverviewCard
              trips={state.trips.items}
              status={state.trips.status}
              error={state.trips.error}
              onRetry={loadDashboardData}
            />
            <ExpenseOverviewCard
              maintenanceLogs={state.maintenance.items}
              status={state.maintenance.status}
              error={state.maintenance.error}
              onRetry={loadDashboardData}
            />
            <VehicleStatusCard
              vehicles={state.vehicles.items}
              status={state.vehicles.status}
              error={state.vehicles.error}
              onRetry={loadDashboardData}
            />
          </div>

          {/* Row 3: Maintenance Activity & Quick Actions */}
          <div className="ff-dash-row-2">
            <UpcomingMaintenanceCard
              maintenanceLogs={state.maintenance.items}
              maintenanceStatus={state.maintenance.status}
              maintenanceError={state.maintenance.error}
              vehicles={state.vehicles.items}
              vehiclesStatus={state.vehicles.status}
              serviceMileageThreshold={preferences.serviceMileageThreshold}
              onRetry={loadDashboardData}
            />
            <QuickActionsCard permissions={permissions} />
          </div>
        </div>

        {/* Right Intelligence & Summary Rail */}
        <RightSidebarCards
          role={role}
          permissions={permissions}
          vehicles={state.vehicles.items}
          totalVehicleCount={state.vehicles.totalElements}
          trips={state.trips.items}
          drivers={state.drivers.items}
          driversStatus={state.drivers.status}
          maintenanceLogs={state.maintenance.items}
          maintenanceStatus={state.maintenance.status}
          liveFleet={state.liveFleet.items}
          liveStatus={state.liveFleet.status}
          loading={state.loading}
          serviceMileageThreshold={preferences.serviceMileageThreshold}
        />
      </div>

      <DashboardFooter role={role} />
    </main>
  );
}
