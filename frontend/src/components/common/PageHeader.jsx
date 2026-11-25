import React from 'react';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}) {
  return (
    <header className="ff-page-header">
      <div className="ff-page-header-copy">
        {eyebrow ? <div className="ff-eyebrow">{eyebrow}</div> : null}
        <h1 className="ff-page-title">{title}</h1>
        {subtitle ? <p className="ff-page-subtitle">{subtitle}</p> : null}
        {meta ? <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{meta}</div> : null}
      </div>
      {actions ? <div className="ff-page-header-actions">{actions}</div> : null}
    </header>
  );
}
