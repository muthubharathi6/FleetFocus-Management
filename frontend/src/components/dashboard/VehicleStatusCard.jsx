import React from 'react';
import { HorizontalProgressList } from '../common/Charts';
import { TruckIcon } from '../common/Icons';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks';

export default function VehicleStatusCard({
  vehicles = [],
  status = 'ready',
  error = null,
  onRetry,
}) {
  const total = vehicles.length;

  const available = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'AVAILABLE'
  ).length;

  const onTrip = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'ON_TRIP'
  ).length;

  const underMaintenance = vehicles.filter(
    (v) => String(v?.status || '').toUpperCase() === 'UNDER_MAINTENANCE'
  ).length;

  const other = Math.max(0, total - available - onTrip - underMaintenance);

  const items = [
    {
      label: 'Available',
      count: available,
      percent: total > 0 ? (available / total) * 100 : 0,
      color: '#10b981',
    },
    {
      label: 'On Trip',
      count: onTrip,
      percent: total > 0 ? (onTrip / total) * 100 : 0,
      color: '#38bdf8',
    },
    {
      label: 'Under Maintenance',
      count: underMaintenance,
      percent: total > 0 ? (underMaintenance / total) * 100 : 0,
      color: '#f59e0b',
    },
    ...(other > 0
      ? [
          {
            label: 'Other',
            count: other,
            percent: total > 0 ? (other / total) * 100 : 0,
            color: '#64748b',
          },
        ]
      : []),
  ];

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span className="ff-card-icon">
            <TruckIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Vehicle Status</h2>
            <p className="ff-card-subtitle">Live distribution across {total} vehicles</p>
          </div>
        </div>
      </div>

      {status === 'loading' && total === 0 ? (
        <LoadingState title="Loading statuses..." description="Fetching vehicle status breakdown." />
      ) : status === 'error' ? (
        <ErrorState
          title="Status Unavailable"
          description={error || 'Unable to load vehicle statuses.'}
          onRetry={onRetry}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<TruckIcon size={20} />}
          title="No Vehicles Registered"
          description="Add vehicles to view live operational status distribution."
        />
      ) : (
        <HorizontalProgressList items={items} />
      )}
    </article>
  );
}
