import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from './PageHeader';
import { EmptyState } from './StateBlocks';

/**
 * Clean Phase 1 route shell for newly registered modules (Pages 5, 7, 8, 9, 10)
 * prior to their dedicated implementation phases. Displays zero dummy data.
 */
export default function ModuleStagePlaceholder({
  eyebrow,
  title,
  subtitle,
  phaseLabel,
  description,
  icon,
}) {
  return (
    <main className="ff-page">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          <Link to="/" className="ff-btn ff-btn-secondary">
            Back to Dashboard
          </Link>
        }
      />

      <section className="ff-card">
        <EmptyState
          icon={icon}
          title={`${title} — Scheduled for ${phaseLabel}`}
          description={description}
        />
      </section>
    </main>
  );
}
