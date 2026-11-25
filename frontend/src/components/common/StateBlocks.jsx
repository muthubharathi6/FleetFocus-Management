import React from 'react';
import { AlertTriangleIcon, LockIcon, RefreshIcon, ShieldIcon } from './Icons';

export function LoadingState({
  title = 'Loading data...',
  description = 'Fetching live records from FleetFocus servers.',
}) {
  return (
    <div className="ff-state-box" role="status" aria-live="polite">
      <div className="ff-spinner" aria-hidden="true" />
      <h3 className="ff-state-title">{title}</h3>
      <p className="ff-state-desc">{description}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title = 'No records found',
  description = 'There are no records matching your current view.',
  action,
}) {
  return (
    <div className="ff-state-box">
      <div className="ff-state-icon">{icon || <ShieldIcon size={22} />}</div>
      <h3 className="ff-state-title">{title}</h3>
      <p className="ff-state-desc">{description}</p>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load data',
  description = 'An error occurred while communicating with the backend API.',
  onRetry,
}) {
  return (
    <div className="ff-state-box is-error" role="alert">
      <div className="ff-state-icon">
        <AlertTriangleIcon size={22} />
      </div>
      <h3 className="ff-state-title">{title}</h3>
      <p className="ff-state-desc">{description}</p>
      {onRetry ? (
        <button
          type="button"
          className="ff-btn ff-btn-secondary ff-btn-sm"
          onClick={onRetry}
          style={{ marginTop: 8 }}
        >
          <RefreshIcon size={14} />
          <span>Retry</span>
        </button>
      ) : null}
    </div>
  );
}

export function UnavailableState({
  title = 'Access Restricted or Data Unavailable',
  description = 'Your current role does not have permission to view this resource.',
  action,
}) {
  return (
    <div className="ff-state-box is-warning">
      <div className="ff-state-icon">
        <LockIcon size={22} />
      </div>
      <h3 className="ff-state-title">{title}</h3>
      <p className="ff-state-desc">{description}</p>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
