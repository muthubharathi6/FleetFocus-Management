import React from 'react';
import { formatRoleLabel } from '../../utils/roleUtils';
import { TruckIcon } from '../common/Icons';

export default function DashboardFooter({ role }) {
  return (
    <footer className="ff-dash-footer" aria-label="Dashboard footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="ff-card-icon" style={{ width: 30, height: 30, borderRadius: 8 }}>
          <TruckIcon size={15} />
        </span>
        <span>
          <strong>FleetFocus</strong> — Live Operational Fleet Management Platform
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {role ? (
          <span className="ff-badge ff-badge-neutral">
            Role: {formatRoleLabel(role)}
          </span>
        ) : null}
        <span className="ff-badge ff-badge-success">
          <span className="ff-badge-dot" />
          Backend Synchronized
        </span>
      </div>
    </footer>
  );
}
