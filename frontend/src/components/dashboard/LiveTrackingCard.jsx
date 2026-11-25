import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadarIcon } from '../common/Icons';
import { EmptyState, ErrorState, LoadingState, UnavailableState } from '../common/StateBlocks';

function getMarkerColor(item, overspeedThreshold) {
  if (item?.speed !== null && item?.speed !== undefined && Number(item.speed) > overspeedThreshold) {
    return '#ef4444';
  }
  const status = String(item?.status || '').toUpperCase();
  if (status === 'ON_TRIP') return '#10b981';
  if (status === 'UNDER_MAINTENANCE') return '#f59e0b';
  return '#38bdf8';
}

export default function LiveTrackingCard({
  liveFleet = [],
  status = 'loading',
  error = null,
  overspeedThreshold = 90,
  onRetry,
}) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  const { plotted, counts } = useMemo(() => {
    const withCoords = liveFleet.filter(
      (v) =>
        v?.latitude !== null &&
        v?.latitude !== undefined &&
        v?.longitude !== null &&
        v?.longitude !== undefined &&
        Number.isFinite(Number(v.latitude)) &&
        Number.isFinite(Number(v.longitude))
    );

    const lats = withCoords.map((v) => Number(v.latitude));
    const lngs = withCoords.map((v) => Number(v.longitude));
    const minLat = lats.length ? Math.min(...lats) : 0;
    const maxLat = lats.length ? Math.max(...lats) : 1;
    const minLng = lngs.length ? Math.min(...lngs) : 0;
    const maxLng = lngs.length ? Math.max(...lngs) : 1;
    const latSpan = Math.max(maxLat - minLat, 0.5);
    const lngSpan = Math.max(maxLng - minLng, 0.5);

    const normalized = withCoords.map((item, idx) => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      const x =
        withCoords.length === 1
          ? 200
          : 44 + ((lng - minLng) / lngSpan) * 312;
      const y =
        withCoords.length === 1
          ? 100
          : 168 - ((lat - minLat) / latSpan) * 128;

      return {
        ...item,
        key: item.vehicleId ?? item.licensePlate ?? idx,
        x,
        y,
        color: getMarkerColor(item, overspeedThreshold),
      };
    });

    const summary = {
      gpsActive: withCoords.length,
      offline: Math.max(0, liveFleet.length - withCoords.length),
      onTrip: liveFleet.filter((v) => String(v?.status).toUpperCase() === 'ON_TRIP').length,
      overspeed: liveFleet.filter(
        (v) => v?.speed !== null && v?.speed !== undefined && Number(v.speed) > overspeedThreshold
      ).length,
    };

    return { plotted: normalized, counts: summary };
  }, [liveFleet, overspeedThreshold]);

  const selectedVehicle = plotted.find((v) => v.key === selectedId) || plotted[0] || null;

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span className="ff-card-icon">
            <RadarIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Live Fleet Tracking</h2>
            <p className="ff-card-subtitle">GPS telemetry positions from backend</p>
          </div>
        </div>

        {status !== 'restricted' ? (
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => navigate('/live')}
          >
            View Live →
          </button>
        ) : null}
      </div>

      {status === 'restricted' ? (
        <UnavailableState
          title="Telemetry Restricted"
          description="Live GPS monitoring is available to Fleet Manager and Dispatcher roles."
        />
      ) : status === 'loading' ? (
        <LoadingState
          title="Connecting to telemetry..."
          description="Loading live vehicle coordinates."
        />
      ) : status === 'error' ? (
        <ErrorState
          title="Telemetry Unavailable"
          description={error || 'Unable to load /api/monitoring/live.'}
          onRetry={onRetry}
        />
      ) : liveFleet.length === 0 ? (
        <EmptyState
          icon={<RadarIcon size={20} />}
          title="No Vehicles in Telemetry"
          description="No vehicles are currently returned by live monitoring."
        />
      ) : (
        <>
          <div className="ff-radar-box">
            <svg viewBox="0 0 400 200" className="ff-radar-svg" role="img" aria-label="Live fleet GPS plot">
              <defs>
                <pattern id="ffRadarGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="400" height="200" fill="url(#ffRadarGrid)" />
              <circle cx="200" cy="100" r="76" fill="none" stroke="rgba(56, 189, 248, 0.14)" strokeDasharray="4 4" />
              <circle cx="200" cy="100" r="42" fill="none" stroke="rgba(56, 189, 248, 0.12)" />

              {plotted.length === 0 ? (
                <g>
                  <text
                    x="200"
                    y="96"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="14"
                    fontWeight="700"
                  >
                    No Active GPS Broadcasts
                  </text>
                  <text
                    x="200"
                    y="116"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="12"
                    fontWeight="500"
                  >
                    Coordinates appear when vehicles report telemetry
                  </text>
                </g>
              ) : (
                plotted.map((v) => {
                  const isActive = selectedVehicle && selectedVehicle.key === v.key;
                  return (
                    <g
                      key={v.key}
                      transform={`translate(${v.x}, ${v.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(v.key)}
                      onMouseEnter={() => setSelectedId(v.key)}
                    >
                      {isActive ? (
                        <circle cx="0" cy="0" r="14" fill={v.color} fillOpacity="0.22" />
                      ) : null}
                      <circle cx="0" cy="0" r="6" fill={v.color} stroke="#050b18" strokeWidth="2" />
                      <text
                        x="10"
                        y="4"
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {v.licensePlate || `#${v.vehicleId}`}
                      </text>
                    </g>
                  );
                })
              )}
            </svg>

            {selectedVehicle ? (
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  bottom: 8,
                  padding: '7px 10px',
                  borderRadius: 9,
                  background: 'rgba(5, 11, 24, 0.88)',
                  border: '1px solid var(--ff-border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 11.5,
                  color: '#f1f5f9',
                  flexWrap: 'wrap',
                }}
              >
                <strong>
                  {selectedVehicle.licensePlate}{' '}
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                    ({selectedVehicle.model || 'Vehicle'})
                  </span>
                </strong>
                <span className="ff-tabular" style={{ color: '#38bdf8' }}>
                  {selectedVehicle.speed !== null && selectedVehicle.speed !== undefined
                    ? `${Number(selectedVehicle.speed).toFixed(1)} km/h`
                    : 'Speed: Not Available'}
                  {' · '}
                  {selectedVehicle.fuelLevel !== null && selectedVehicle.fuelLevel !== undefined
                    ? `Fuel ${Number(selectedVehicle.fuelLevel).toFixed(0)}%`
                    : 'Fuel: Not Available'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="ff-radar-legend">
            <span className="ff-radar-legend-item">
              <span className="ff-badge-dot" style={{ color: '#10b981' }} />
              GPS Active ({counts.gpsActive})
            </span>
            <span className="ff-radar-legend-item">
              <span className="ff-badge-dot" style={{ color: '#64748b' }} />
              Offline ({counts.offline})
            </span>
            {counts.overspeed > 0 ? (
              <span className="ff-radar-legend-item" style={{ color: 'var(--ff-danger)' }}>
                <span className="ff-badge-dot" style={{ color: '#ef4444' }} />
                Overspeed ({counts.overspeed})
              </span>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
