import React, { useMemo, useState } from 'react';
import { DualBarChart } from '../common/Charts';
import { RouteIcon } from '../common/Icons';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks';

function buildBuckets(trips, range) {
  const now = new Date();
  const buckets = [];

  if (range === '7D') {
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      buckets.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        start: d.getTime(),
        end: next.getTime(),
        primary: 0,
        secondary: 0,
      });
    }
  } else if (range === '30D') {
    for (let w = 3; w >= 0; w -= 1) {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      buckets.push({
        label: `W${4 - w}`,
        start: start.getTime(),
        end: end.getTime() + 1,
        primary: 0,
        secondary: 0,
      });
    }
  } else {
    for (let m = 2; m >= 0; m -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      buckets.push({
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        start: start.getTime(),
        end: end.getTime(),
        primary: 0,
        secondary: 0,
      });
    }
  }

  let matchedCount = 0;

  trips.forEach((trip) => {
    const rawTime = trip?.startTime || trip?.endTime;
    if (!rawTime) return;
    const ts = new Date(rawTime).getTime();
    if (Number.isNaN(ts)) return;

    const bucket = buckets.find((b) => ts >= b.start && ts < b.end);
    if (!bucket) return;

    matchedCount += 1;
    const status = String(trip?.status || '').toUpperCase();
    if (status === 'COMPLETED') {
      bucket.primary += 1;
    } else if (status === 'ACTIVE') {
      bucket.secondary += 1;
    }
  });

  return { buckets, matchedCount };
}

export default function TripOverviewCard({
  trips = [],
  status = 'ready',
  error = null,
  onRetry,
}) {
  const [range, setRange] = useState('7D');

  const { buckets, matchedCount } = useMemo(
    () => buildBuckets(trips, range),
    [trips, range]
  );

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span className="ff-card-icon">
            <RouteIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Trip Overview</h2>
            <p className="ff-card-subtitle">Real trip counts by period</p>
          </div>
        </div>

        <div className="ff-filter-pills" role="tablist" aria-label="Trip period">
          {['7D', '30D', '3M'].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={range === tab}
              className={`ff-filter-pill ${range === tab ? 'is-active' : ''}`}
              onClick={() => setRange(tab)}
              style={{ padding: '4px 9px', fontSize: 11.5 }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <LoadingState title="Loading trips..." description="Grouping trip history from backend." />
      ) : status === 'error' ? (
        <ErrorState
          title="Trip Chart Unavailable"
          description={error || 'Unable to load /api/trips.'}
          onRetry={onRetry}
        />
      ) : matchedCount === 0 ? (
        <EmptyState
          icon={<RouteIcon size={20} />}
          title={`No Trips in Last ${range}`}
          description={
            trips.length > 0
              ? `No trip start dates fell inside the last ${range}. Try switching to 30D or 3M.`
              : 'No trips have been dispatched yet.'
          }
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 12, color: 'var(--ff-text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="ff-badge-dot" style={{ color: '#06b6d4' }} />
              Completed
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="ff-badge-dot" style={{ color: '#3b82f6' }} />
              Active
            </span>
          </div>

          <DualBarChart
            data={buckets}
            primaryLabel="Completed"
            secondaryLabel="Active"
            primaryColor="#06b6d4"
            secondaryColor="#3b82f6"
            height={165}
          />
        </>
      )}
    </article>
  );
}
