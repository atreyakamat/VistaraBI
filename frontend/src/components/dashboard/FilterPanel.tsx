/**
 * FILTER PANEL COMPONENT
 * Advanced filtering with multiple types and persistence
 */

import React, { useState } from 'react';
import { Filter, X, Save, Upload, Calendar, Search } from 'lucide-react';

interface FilterPanelProps {
  id: string;
  config: any;
  filters: Record<string, any>;
  onChange: (filterName: string, value: any) => void;
  onClear: () => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (name: string) => void;
  loading?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  id,
  config,
  filters,
  onChange,
  onClear,
  onSavePreset,
  onLoadPreset,
  loading
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);

  const activeFilterCount = Object.keys(filters).filter(k => filters[k]).length;

  const renderFilter = (filter: any) => {
    const currentValue = filters[filter.field];

    switch (filter.type) {
      case 'date-range':
        return (
          <div key={filter.field} className="filter-group">
            <label className="filter-label" htmlFor={`filter-${filter.field}`}>
              <Calendar size={14} aria-hidden="true" />
              {filter.label}
            </label>
            <div className="filter-date-range">
              <select
                id={`filter-${filter.field}`}
                className="filter-select"
                value={currentValue?.preset || ''}
                onChange={(e) => onChange(filter.field, { preset: e.target.value })}
                aria-label={filter.label}
              >
                <option value="">Select period...</option>
                {filter.presets.map((preset: any) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              {currentValue?.preset === 'custom' && (
                <div className="filter-custom-range">
                  <input
                    type="date"
                    className="filter-input"
                    value={currentValue?.startDate || ''}
                    onChange={(e) => onChange(filter.field, {
                      ...currentValue,
                      startDate: e.target.value
                    })}
                    aria-label="Start date"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="filter-input"
                    value={currentValue?.endDate || ''}
                    onChange={(e) => onChange(filter.field, {
                      ...currentValue,
                      endDate: e.target.value
                    })}
                    aria-label="End date"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'category':
        return (
          <div key={filter.field} className="filter-group">
            <label className="filter-label" htmlFor={`filter-${filter.field}`}>
              {filter.label}
            </label>
            {filter.features.searchable && (
              <div className="filter-search">
                <Search size={14} aria-hidden="true" />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search..."
                  aria-label={`Search ${filter.label}`}
                />
              </div>
            )}
            <div className="filter-checkbox-group" role="group" aria-label={filter.label}>
              {filter.features.selectAll && (
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={currentValue?.length === filter.options.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange(filter.field, filter.options.map((o: any) => o.value));
                      } else {
                        onChange(filter.field, []);
                      }
                    }}
                  />
                  <span>Select All</span>
                </label>
              )}
              {filter.options.slice(0, 10).map((option: any) => (
                <label key={option.value} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={currentValue?.includes?.(option.value) || false}
                    onChange={(e) => {
                      const newValue = currentValue ? [...currentValue] : [];
                      if (e.target.checked) {
                        newValue.push(option.value);
                      } else {
                        const index = newValue.indexOf(option.value);
                        if (index > -1) newValue.splice(index, 1);
                      }
                      onChange(filter.field, newValue);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'numeric-range':
        return (
          <div key={filter.field} className="filter-group">
            <label className="filter-label" htmlFor={`filter-${filter.field}-min`}>
              {filter.label}
            </label>
            <div className="filter-range-inputs">
              <input
                id={`filter-${filter.field}-min`}
                type="number"
                className="filter-input"
                placeholder="Min"
                value={currentValue?.min || filter.min}
                onChange={(e) => onChange(filter.field, {
                  ...currentValue,
                  min: parseFloat(e.target.value)
                })}
                min={filter.min}
                max={filter.max}
                aria-label={`${filter.label} minimum`}
              />
              <span>to</span>
              <input
                id={`filter-${filter.field}-max`}
                type="number"
                className="filter-input"
                placeholder="Max"
                value={currentValue?.max || filter.max}
                onChange={(e) => onChange(filter.field, {
                  ...currentValue,
                  max: parseFloat(e.target.value)
                })}
                min={filter.min}
                max={filter.max}
                aria-label={`${filter.label} maximum`}
              />
            </div>
            {filter.features.slider && (
              <input
                type="range"
                className="filter-slider"
                min={filter.min}
                max={filter.max}
                value={currentValue?.max || filter.max}
                onChange={(e) => onChange(filter.field, {
                  ...currentValue,
                  max: parseFloat(e.target.value)
                })}
                aria-label={`${filter.label} slider`}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="filter-panel skeleton" style={{ height: '300px' }} aria-hidden="true" />
    );
  }

  return (
    <aside
      id={id}
      className="filter-panel"
      role="region"
      aria-label="Filters"
    >
      {/* Header */}
      <div className="filter-header">
        <h2 className="filter-title">
          <Filter size={18} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge" aria-label={`${activeFilterCount} active filters`}>
              {activeFilterCount}
            </span>
          )}
        </h2>
        <button
          className="filter-collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Filter Groups */}
          <div className="filter-groups">
            {config.filters.map(renderFilter)}
          </div>

          {/* Actions */}
          <div className="filter-actions">
            <button
              className="filter-button filter-button-primary"
              onClick={() => {/* Filters are applied in real-time */}}
              aria-label="Filters are applied automatically"
            >
              Auto-Applied
            </button>
            <button
              className="filter-button filter-button-secondary"
              onClick={onClear}
              disabled={activeFilterCount === 0}
              aria-label="Clear all filters"
            >
              <X size={14} aria-hidden="true" />
              Clear All
            </button>
          </div>

          {/* Preset Management */}
          <div className="filter-presets">
            <button
              className="filter-button filter-button-secondary"
              onClick={() => setShowPresetModal(true)}
              disabled={activeFilterCount === 0}
              aria-label="Save current filters as preset"
            >
              <Save size={14} aria-hidden="true" />
              Save Preset
            </button>
            <button
              className="filter-button filter-button-secondary"
              onClick={() => {
                const presets = JSON.parse(localStorage.getItem('dashboardFilterPresets') || '{}');
                const presetNames = Object.keys(presets);
                if (presetNames.length > 0) {
                  onLoadPreset(presetNames[0]);
                }
              }}
              aria-label="Load saved preset"
            >
              <Upload size={14} aria-hidden="true" />
              Load Preset
            </button>
          </div>

          {/* Save Preset Modal */}
          {showPresetModal && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title">
              <div className="modal-content">
                <h3 id="preset-modal-title">Save Filter Preset</h3>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  autoFocus
                  aria-label="Preset name"
                />
                <div className="modal-actions">
                  <button
                    className="filter-button filter-button-primary"
                    onClick={() => {
                      if (presetName.trim()) {
                        onSavePreset(presetName);
                        setPresetName('');
                        setShowPresetModal(false);
                      }
                    }}
                    disabled={!presetName.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="filter-button filter-button-secondary"
                    onClick={() => {
                      setPresetName('');
                      setShowPresetModal(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default FilterPanel;
