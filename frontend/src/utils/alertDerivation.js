/**
 * Derives real-time operational alerts strictly from actual backend responses.
 * Never invents vehicles, speeds, plates, or timestamps.
 * Acknowledgement state is local only (no backend AlertController exists).
 */

export function deriveOperationalAlerts({
  vehicles = [],
  trips = [],
  liveFleet = [],
  thresholds = {},
}) {
  const overspeedLimit = Number(thresholds.overspeedThreshold) || 90;
  const lowFuelLimit = Number(thresholds.lowFuelThreshold) || 25;
  const serviceMileageLimit = Number(thresholds.serviceMileageThreshold) || 40000;

  const alerts = [];

  // 1. Live telemetry alerts (overspeed & low fuel)
  if (Array.isArray(liveFleet)) {
    liveFleet.forEach((item) => {
      const plate = item?.licensePlate || `Vehicle #${item?.vehicleId ?? 'Unknown'}`;
      const speed = item?.speed;
      const fuel = item?.fuelLevel;

      if (speed !== null && speed !== undefined && Number(speed) > overspeedLimit) {
        alerts.push({
          id: `overspeed-${item.vehicleId ?? plate}`,
          severity: 'critical',
          category: 'Telemetry',
          title: `Overspeed Detected — ${plate}`,
          description: `Recorded speed ${Number(speed).toFixed(1)} km/h exceeds ${overspeedLimit} km/h threshold.`,
          meta: item?.recordedAt ? new Date(item.recordedAt).toLocaleTimeString() : 'Live telemetry',
          route: '/live',
        });
      }

      if (fuel !== null && fuel !== undefined && Number(fuel) < lowFuelLimit) {
        alerts.push({
          id: `lowfuel-${item.vehicleId ?? plate}`,
          severity: Number(fuel) < 15 ? 'critical' : 'warning',
          category: 'Fuel Telemetry',
          title: `Low Fuel Level — ${plate}`,
          description: `Telemetry reports ${Number(fuel).toFixed(0)}% fuel remaining (below ${lowFuelLimit}%).`,
          meta: item?.recordedAt ? new Date(item.recordedAt).toLocaleTimeString() : 'Live telemetry',
          route: '/live',
        });
      }
    });
  }

  // 2. Vehicle status & high-mileage service alerts
  if (Array.isArray(vehicles)) {
    vehicles.forEach((vehicle) => {
      const plate = vehicle?.licensePlate || `Vehicle #${vehicle?.id ?? 'Unknown'}`;
      const status = String(vehicle?.status || '').toUpperCase();
      const mileage = Number(vehicle?.currentMileage);

      if (status === 'UNDER_MAINTENANCE') {
        alerts.push({
          id: `maint-${vehicle.id ?? plate}`,
          severity: 'warning',
          category: 'Maintenance',
          title: `Under Maintenance — ${plate}`,
          description: `${vehicle?.model || 'Fleet vehicle'} is currently marked UNDER_MAINTENANCE.`,
          meta: Number.isFinite(mileage) ? `${mileage.toLocaleString('en-IN')} km` : 'Workshop',
          route: '/vehicles',
        });
      }

      if (Number.isFinite(mileage) && mileage >= serviceMileageLimit) {
        alerts.push({
          id: `mileage-${vehicle.id ?? plate}`,
          severity: 'warning',
          category: 'Service Threshold',
          title: `High Mileage Check — ${plate}`,
          description: `Odometer at ${mileage.toLocaleString('en-IN')} km (threshold: ${serviceMileageLimit.toLocaleString('en-IN')} km).`,
          meta: vehicle?.model || 'Fleet vehicle',
          route: '/maintenance',
        });
      }
    });
  }

  // 3. Active trips informational items
  if (Array.isArray(trips)) {
    trips
      .filter((t) => String(t?.status || '').toUpperCase() === 'ACTIVE')
      .forEach((trip) => {
        const plate = trip?.vehicle?.licensePlate || `Trip #${trip.id}`;
        const driverName = trip?.driver?.user?.username || 'Assigned driver';
        alerts.push({
          id: `trip-active-${trip.id}`,
          severity: 'info',
          category: 'Operations',
          title: `Active Trip #${trip.id} — ${plate}`,
          description: `In transit with ${driverName}${trip?.distanceCovered ? ` (${Number(trip.distanceCovered).toFixed(1)} km logged)` : ''}.`,
          meta: trip?.startTime ? new Date(trip.startTime).toLocaleDateString('en-IN') : 'Active',
          route: '/trips',
        });
      });
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
}
