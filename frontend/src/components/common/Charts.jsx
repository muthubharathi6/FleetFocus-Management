import React, { useState } from 'react';

/**
 * Reusable interactive SVG chart primitives with zero external chart dependencies.
 * Never invents fallback numbers — displays honest empty states when data sums to 0.
 */

export function RadialGauge({
  percent = 0,
  label = 'Utilization',
  size = 132,
  strokeWidth = 11,
}) {
  const safePct = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safePct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${label}: ${safePct.toFixed(0)}%`}>
        <defs>
          <linearGradient id="ffGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.16)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ffGaugeGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 450ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span className="ff-tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ff-text-primary)' }}>
          {safePct.toFixed(0)}%
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ff-text-muted)' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function DonutChart({
  segments = [],
  centerValue = '0',
  centerLabel = 'Total',
  size = 148,
  strokeWidth = 14,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const validSegments = segments.filter((s) => Number(s.value) > 0);
  const total = validSegments.reduce((acc, s) => acc + Number(s.value), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          validSegments.map((seg, idx) => {
            const fraction = Number(seg.value) / total;
            const length = fraction * circumference;
            const offset = -cumulative;
            cumulative += length;
            const isHovered = hoveredIdx === idx;
            return (
              <circle
                key={seg.label || idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color || '#38bdf8'}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${Math.max(length - 2, 1)} ${circumference}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ cursor: 'pointer', transition: 'stroke-width 160ms ease' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 16,
          pointerEvents: 'none',
        }}
      >
        <span className="ff-tabular" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ff-text-primary)' }}>
          {hoveredIdx !== null && validSegments[hoveredIdx]
            ? validSegments[hoveredIdx].displayValue ?? validSegments[hoveredIdx].value
            : centerValue}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ff-text-muted)', marginTop: 2 }}>
          {hoveredIdx !== null && validSegments[hoveredIdx]
            ? validSegments[hoveredIdx].label
            : centerLabel}
        </span>
      </div>
    </div>
  );
}

export function DualBarChart({
  data = [],
  primaryLabel = 'Completed',
  secondaryLabel = 'Active',
  primaryColor = '#06b6d4',
  secondaryColor = '#3b82f6',
  height = 175,
}) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(Number(d.primary) || 0, Number(d.secondary) || 0))
  );

  if (!data.length) {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--ff-text-muted)', fontSize: 13 }}>
        No chart data available for this period.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
          alignItems: 'end',
          gap: 10,
          height,
          padding: '12px 6px 4px',
          borderBottom: '1px solid var(--ff-border)',
        }}
      >
        {data.map((item, idx) => {
          const pVal = Number(item.primary) || 0;
          const sVal = Number(item.secondary) || 0;
          const pPct = (pVal / maxVal) * 100;
          const sPct = (sVal / maxVal) * 100;

          return (
            <div
              key={item.label || idx}
              onMouseEnter={() => setHovered({ idx, item })}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 4,
                  height: '100%',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 12,
                    maxWidth: '42%',
                    height: `${pVal > 0 ? Math.max(pPct, 6) : 2}%`,
                    borderRadius: '6px 6px 2px 2px',
                    background: pVal > 0 ? primaryColor : 'rgba(148, 163, 184, 0.16)',
                    transition: 'height 320ms ease, opacity 150ms ease',
                    opacity: hovered && hovered.idx !== idx ? 0.55 : 1,
                  }}
                />
                <div
                  style={{
                    width: 12,
                    maxWidth: '42%',
                    height: `${sVal > 0 ? Math.max(sPct, 6) : 2}%`,
                    borderRadius: '6px 6px 2px 2px',
                    background: sVal > 0 ? secondaryColor : 'rgba(148, 163, 184, 0.12)',
                    transition: 'height 320ms ease, opacity 150ms ease',
                    opacity: hovered && hovered.idx !== idx ? 0.55 : 1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
          gap: 10,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        {data.map((item, idx) => (
          <span key={item.label || idx} style={{ fontSize: 11, color: 'var(--ff-text-muted)', fontWeight: 600 }}>
            {item.label}
          </span>
        ))}
      </div>

      {hovered ? (
        <div
          className="ff-chart-tooltip"
          style={{
            top: 4,
            right: 4,
          }}
        >
          <strong>{hovered.item.label}</strong>
          <div style={{ marginTop: 4, display: 'flex', gap: 12 }}>
            <span style={{ color: primaryColor }}>
              {primaryLabel}: {hovered.item.primary}
            </span>
            <span style={{ color: secondaryColor }}>
              {secondaryLabel}: {hovered.item.secondary}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HorizontalProgressList({ items = [] }) {
  if (!items.length) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ff-text-muted)', fontSize: 13 }}>
        No breakdown data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((item, idx) => {
        const pct = Math.max(0, Math.min(100, Number(item.percent) || 0));
        return (
          <div key={item.label || idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ff-text-primary)', fontWeight: 600 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color || '#38bdf8',
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </span>
              <span className="ff-tabular" style={{ color: 'var(--ff-text-secondary)', fontWeight: 600 }}>
                {item.displayValue ?? item.count}{' '}
                <span style={{ color: 'var(--ff-text-muted)', fontWeight: 500 }}>({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="ff-progress-track">
              <div
                className="ff-progress-fill"
                style={{
                  width: `${pct}%`,
                  background: item.color || '#38bdf8',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
