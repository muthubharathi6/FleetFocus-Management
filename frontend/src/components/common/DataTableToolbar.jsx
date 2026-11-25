import React from 'react';
import { SearchIcon } from './Icons';

export default function DataTableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  activeFilter,
  onFilterChange,
  sortValue,
  sortOptions = [],
  onSortChange,
  rightActions,
}) {
  return (
    <div className="ff-toolbar">
      <div className="ff-toolbar-left">
        {onSearchChange ? (
          <div className="ff-search-field">
            <span className="ff-search-field-icon">
              <SearchIcon size={15} />
            </span>
            <input
              type="search"
              className="ff-input"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}

        {filters.length > 0 && onFilterChange ? (
          <div className="ff-filter-pills" role="tablist" aria-label="Status filter">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.value}
                className={`ff-filter-pill ${activeFilter === filter.value ? 'is-active' : ''}`}
                onClick={() => onFilterChange(filter.value)}
              >
                {filter.label}
                {typeof filter.count === 'number' ? ` (${filter.count})` : ''}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ff-toolbar-right">
        {sortOptions.length > 0 && onSortChange ? (
          <select
            className="ff-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort records"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : null}
        {rightActions}
      </div>
    </div>
  );
}
