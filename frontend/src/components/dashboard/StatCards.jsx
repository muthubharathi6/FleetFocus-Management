import React from 'react';
import KpiCard from '../common/KpiCard';
import { ErrorState, LoadingState } from '../common/StateBlocks';
import { CheckCircleIcon, RouteIcon, TruckIcon, WrenchIcon } from '../common/Icons';

export default function StatCards({
  vehicles = [],
  totalVehicleCount,
  vehiclesStatus = 'ready',
  vehiclesError = null,
  trips = [],
  tripsStatus = 'ready',
  maintenanceLogs = [],
  maintenanceStatus = 'restricted',
  role,
  onRetry,
}) {
  if (vehiclesStatus === 'loading' && vehicles.length === 0) {
    return (
      <section className="ff-card" aria-label="Fleet KPIs loading">
        <LoadingState
          title="Loading fleet KPIs..."
          description="Fetching real-time counts from vehicles and trips endpoints."
        />
      </section>
    );
  }

  if (vehiclesStatus === 'error') {
    return (
      <section className="ff-card" aria-label="Fleet KPIs error">
        <ErrorState
          title="Unable to load vehicle KPIs"
          description={vehiclesError || 'Could not retrieve fleet inventory from backend.'}
          onRetry={onRetry}
        />
      </section>
    );
  }

  const totalVehicles =
    typeof totalVehicleCount === 'number' ? totalVehicleCount : vehicles.length;

  const availableVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'AVAILABLE'
  ).length;

  const onTripVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'ON_TRIP'
  ).length;

  const maintenanceVehicles = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'UNDER_MAINTENANCE'
  ).length;

  const activeTrips = trips.filter(
    (t) => String(t?.status || '').toUpperCase() === 'ACTIVE'
  ).length;

  const completedTrips = trips.filter(
    (t) => String(t?.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  const availablePct =
    totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0;

  const isDriver = String(role || '').toUpperCase() === 'DRIVER';

  const maintenanceCaption =
    maintenanceStatus === 'ready'
      ? `${maintenanceLogs.length} service ${maintenanceLogs.length === 1 ? 'log' : 'logs'} recorded`
      : 'Vehicles marked in service';

  const tripsCaption =
    tripsStatus === 'error'
      ? 'Trips endpoint error'
      : isDriver
        ? `${completedTrips} completed (your trips)`
        : `${completedTrips} completed · ${trips.length} total`;

  return (
    <section className="ff-dash-kpi-grid" aria-label="Fleet key performance indicators">
      <KpiCard
        label="Total Vehicles"
        value={totalVehicles}
        caption={
          totalVehicles > 0
            ? `${onTripVehicles} on trip · ${availableVehicles} ready`
            : 'No vehicles registered yet'
        }
        icon={<TruckIcon size={20} />}
        tone="blue"
      />

      <KpiCard
        label="Active Trips"
        value={tripsStatus === 'error' ? '—' : activeTrips}
        caption={tripsCaption}
        icon={<RouteIcon size={20} />}
        tone="emerald"
      />

      <KpiCard
        label="In Maintenance"
        value={maintenanceVehicles}
        caption={maintenanceCaption}
        icon={<WrenchIcon size={20} />}
        tone="amber"
      />

      <KpiCard
        label="Available Vehicles"
        value={availableVehicles}
        caption={`${availablePct}% of fleet ready`}
        icon={<CheckCircleIcon size={20} />}
        tone="cyan"
      />
    </section>
  );
}
