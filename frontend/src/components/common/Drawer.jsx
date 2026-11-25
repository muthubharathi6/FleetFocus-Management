import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

export default function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ff-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <aside
        className="ff-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Details panel'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ff-drawer-header">
          <div>
            {eyebrow ? <div className="ff-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div> : null}
            {title ? <h2 className="ff-drawer-title">{title}</h2> : null}
            {subtitle ? <p className="ff-drawer-subtitle">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              className="ff-icon-btn"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <CloseIcon size={16} />
            </button>
          ) : null}
        </div>

        <div className="ff-drawer-body">{children}</div>

        {footer ? <div className="ff-drawer-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
