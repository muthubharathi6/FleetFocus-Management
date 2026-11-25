import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  size = 'md',
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
      className="ff-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className={`ff-modal-panel size-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {(title || onClose) ? (
          <div className="ff-modal-header">
            <div>
              {eyebrow ? <div className="ff-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div> : null}
              {title ? <h2 className="ff-modal-title">{title}</h2> : null}
              {subtitle ? <p className="ff-modal-subtitle">{subtitle}</p> : null}
            </div>
            {onClose ? (
              <button
                type="button"
                className="ff-icon-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <CloseIcon size={16} />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="ff-modal-body">{children}</div>

        {footer ? <div className="ff-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
