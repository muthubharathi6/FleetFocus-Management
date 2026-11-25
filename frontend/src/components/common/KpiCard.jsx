import React from 'react';

export default function KpiCard({
  label,
  value,
  caption,
  icon,
  tone = 'cyan',
  footerRight,
}) {
  return (
    <article className="ff-kpi">
      <div className="ff-kpi-top">
        <div style={{ minWidth: 0 }}>
          <div className="ff-kpi-label">{label}</div>
          <div className="ff-kpi-value ff-tabular">{value}</div>
        </div>
        {icon ? <div className={`ff-kpi-icon tone-${tone}`}>{icon}</div> : null}
      </div>
      {(caption || footerRight) ? (
        <div className="ff-kpi-footer">
          <span>{caption}</span>
          {footerRight ? <span>{footerRight}</span> : null}
        </div>
      ) : null}
    </article>
  );
}
