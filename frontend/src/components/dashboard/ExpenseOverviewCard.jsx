import React, { useMemo } from 'react';
import { usePreferences } from '../../context/PreferencesContext';
import { DonutChart } from '../common/Charts';
import { FuelIcon } from '../common/Icons';
import { EmptyState, ErrorState, LoadingState, UnavailableState } from '../common/StateBlocks';

const PALETTE = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

export default function ExpenseOverviewCard({
  maintenanceLogs = [],
  status = 'restricted',
  error = null,
  onRetry,
}) {
  const { formatCurrency } = usePreferences();

  const { totalSpend, segments } = useMemo(() => {
    const byVehicle = new Map();
    let total = 0;

    maintenanceLogs.forEach((log) => {
      const cost = Number(log?.cost);
      if (!Number.isFinite(cost) || cost <= 0) return;
      total += cost;
      const key = log?.vehicle?.licensePlate || `Vehicle #${log?.vehicle?.id ?? 'Other'}`;
      byVehicle.set(key, (byVehicle.get(key) || 0) + cost);
    });

    const sorted = Array.from(byVehicle.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const remaining = sorted.slice(4).reduce((sum, [, val]) => sum + val, 0);

    const chartSegments = top.map(([label, value], idx) => ({
      label,
      value,
      displayValue: formatCurrency(value),
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      color: PALETTE[idx % PALETTE.length],
    }));

    if (remaining > 0) {
      chartSegments.push({
        label: 'Other Vehicles',
        value: remaining,
        displayValue: formatCurrency(remaining),
        percent: total > 0 ? Math.round((remaining / total) * 100) : 0,
        color: PALETTE[4],
      });
    }

    return { totalSpend: total, segments: chartSegments };
  }, [maintenanceLogs, formatCurrency]);

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span
            className="ff-card-icon"
            style={{
              background: 'var(--ff-purple-bg)',
              color: '#a78bfa',
              borderColor: 'var(--ff-purple-border)',
            }}
          >
            <FuelIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Maintenance Expenditure</h2>
            <p className="ff-card-subtitle">Actual service logs only (fuel receipts not in API)</p>
          </div>
        </div>
      </div>

      {status === 'restricted' ? (
        <UnavailableState
          title="Expenditure Restricted"
          description="Maintenance cost records are restricted to Fleet Manager and Maintenance Tech roles."
        />
      ) : status === 'loading' ? (
        <LoadingState title="Loading expenses..." description="Aggregating actual maintenance service costs." />
      ) : status === 'error' ? (
        <ErrorState
          title="Expense Data Unavailable"
          description={error || 'Unable to load /api/maintenance.'}
          onRetry={onRetry}
        />
      ) : totalSpend <= 0 ? (
        <EmptyState
          icon={<FuelIcon size={20} />}
          title="No Expenditure Logged"
          description="No maintenance service costs have been recorded in the database yet."
        />
      ) : (
        <div className="ff-expense-body">
          <DonutChart
            segments={segments}
            centerValue={formatCurrency(totalSpend)}
            centerLabel="Service Total"
            size={140}
            strokeWidth={13}
          />

          <div className="ff-expense-legend">
            {segments.map((seg) => (
              <div key={seg.label} className="ff-expense-legend-row">
                <span className="ff-expense-legend-name" title={seg.label}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: seg.color,
                      flexShrink: 0,
                    }}
                  />
                  {seg.label} ({seg.percent}%)
                </span>
                <span className="ff-expense-legend-val">{seg.displayValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
