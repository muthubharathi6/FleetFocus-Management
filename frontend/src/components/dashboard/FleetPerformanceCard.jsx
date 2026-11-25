import React from 'react';
import { AnalyticsIcon } from '../common/Icons';
import { RadialGauge } from '../common/Charts';
import { LoadingState } from '../common/StateBlocks';

export default function FleetPerformanceCard({
  vehicles = [],
  vehiclesStatus = 'ready',
  trips = [],
  tripsStatus = 'ready',
  liveFleet = [],
  liveStatus = 'restricted',
}) {
  const totalVehicles = vehicles.length;
  const onTripCount = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'ON_TRIP'
  ).length;
  const utilizationPct = totalVehicles > 0 ? (onTripCount / totalVehicles) * 100 : 0;

  const totalTripDistance = trips.reduce(
    (sum, t) => sum + (Number(t?.distanceCovered) || 0),
    0
  );

  const completedTrips = trips.filter(
    (t) => String(t?.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  const completionRate =
    tripsStatus === 'ready' && trips.length > 0
      ? `${((completedTrips / trips.length) * 100).toFixed(0)}%`
      : 'Not Available';

  const fuelReadings = liveFleet
    .map((v) => v?.fuelLevel)
    .filter((f) => f !== null && f !== undefined && Number.isFinite(Number(f)))
    .map(Number);

  const avgFuelLabel =
    liveStatus === 'ready' && fuelReadings.length > 0
      ? `${(fuelReadings.reduce((a, b) => a + b, 0) / fuelReadings.length).toFixed(0)}%`
      : 'Not Available';

  const totalOdometer = vehicles.reduce(
    (sum, v) => sum + (Number(v?.currentMileage) || 0),
    0
  );

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span className="ff-card-icon">
            <AnalyticsIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Fleet Performance</h2>
            <p className="ff-card-subtitle">Computed from real backend metrics</p>
          </div>
        </div>
      </div>

      {vehiclesStatus === 'loading' && totalVehicles === 0 ? (
        <LoadingState title="Calculating metrics..." description="Analyzing fleet utilization and trip records." />
      ) : (
        <div className="ff-perf-body">
          <RadialGauge percent={utilizationPct} label="Utilization" size={126} strokeWidth={11} />

          <div className="ff-perf-metrics">
            <div className="ff-perf-metric-row">
              <span className="ff-perf-metric-label">Logged Trip Distance</span>
              <span className="ff-perf-metric-val">
                {tripsStatus === 'ready' ? `${totalTripDistance.toFixed(1)} km` : 'Not Available'}
              </span>
            </div>

            <div className="ff-perf-metric-row">
              <span className="ff-perf-metric-label">Trip Completion Rate</span>
              <span className="ff-perf-metric-val">{completionRate}</span>
            </div>

            <div className="ff-perf-metric-row">
              <span className="ff-perf-metric-label">Avg Live Fuel Level</span>
              <span className="ff-perf-metric-val">{avgFuelLabel}</span>
            </div>

            <div className="ff-perf-metric-row">
              <span className="ff-perf-metric-label">Fleet Odometer Sum</span>
              <span className="ff-perf-metric-val">
                {totalVehicles > 0 ? `${totalOdometer.toLocaleString('en-IN')} km` : '0 km'}
              </span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
