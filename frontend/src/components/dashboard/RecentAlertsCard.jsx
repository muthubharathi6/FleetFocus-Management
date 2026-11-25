import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckCircleIcon } from '../common/Icons';
import { EmptyState, LoadingState } from '../common/StateBlocks';

export default function RecentAlertsCard({ alerts = [], loading = false }) {
  const navigate = useNavigate();
  const topAlerts = alerts.slice(0, 4);

  return (
    <article className="ff-card">
      <div className="ff-card-header">
        <div className="ff-card-title-row">
          <span
            className="ff-card-icon"
            style={{
              background: 'var(--ff-warning-bg)',
              color: 'var(--ff-warning)',
              borderColor: 'var(--ff-warning-border)',
            }}
          >
            <BellIcon size={17} />
          </span>
          <div>
            <h2 className="ff-card-title">Recent Alerts</h2>
            <p className="ff-card-subtitle">Derived live from backend status</p>
          </div>
        </div>

        <button
          type="button"
          className="ff-btn ff-btn-ghost ff-btn-sm"
          onClick={() => navigate('/alerts')}
        >
          View All →
        </button>
      </div>

      {loading && alerts.length === 0 ? (
        <LoadingState
          title="Checking fleet status..."
          description="Evaluating live telemetry, vehicle status, and trip thresholds."
        />
      ) : topAlerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon size={20} />}
          title="No Active Alerts"
          description="All monitored vehicles and trips are currently within configured thresholds."
        />
      ) : (
        <div className="ff-alert-list">
          {topAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              className={`ff-alert-item sev-${alert.severity}`}
              onClick={() => navigate(alert.route || '/alerts')}
            >
              <span className="ff-alert-dot" aria-hidden="true" />
              <div className="ff-alert-body">
                <div className="ff-alert-title">{alert.title}</div>
                <div className="ff-alert-desc">{alert.description}</div>
              </div>
              <span className="ff-alert-meta">{alert.meta}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
