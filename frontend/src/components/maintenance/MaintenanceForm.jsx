import React, { useEffect, useState } from 'react';
import vehicleService from '../../services/vehicleService';
import userService from '../../services/userService';
import maintenanceService from '../../services/maintenanceService';
import { usePreferences } from '../../context/PreferencesContext';
import { LoadingState } from '../common/StateBlocks';

export default function MaintenanceForm({ onRefresh, onClose }) {
  const { preferences } = usePreferences();
  const currencySymbol = preferences.currency === 'USD' ? '$' : '₹';

  const [vehicles, setVehicles] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const [vehicleId, setVehicleId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFormData = async () => {
      setLoadingOptions(true);
      setError('');
      try {
        const [vRes, tRes] = await Promise.all([
          vehicleService.getAll(0, 200),
          userService.getTechnicians(),
        ]);

        const vList = vRes?.data?.content || vRes?.data || [];
        setVehicles(Array.isArray(vList) ? vList : []);
        setTechnicians(Array.isArray(tRes?.data) ? tRes.data : []);
      } catch (err) {
        console.error('Failed to load maintenance form data:', err);
        setError(
          err?.response?.data?.message ||
            'Unable to load vehicles and technicians.'
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadFormData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vehicleId) {
      setError('Please select a vehicle.');
      return;
    }

    if (!technicianId) {
      setError('Please select a technician.');
      return;
    }

    if (!serviceDate) {
      setError('Please select a service date.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a maintenance description.');
      return;
    }

    if (cost === '' || Number.isNaN(Number(cost)) || Number(cost) < 0) {
      setError('Please enter a valid non-negative maintenance cost.');
      return;
    }

    setLoading(true);
    try {
      await maintenanceService.log({
        vehicle: { id: Number(vehicleId) },
        technician: { id: Number(technicianId) },
        serviceDate,
        description: description.trim(),
        cost: parseFloat(cost),
      });

      if (onRefresh) await onRefresh();
      if (onClose) onClose();
    } catch (err) {
      console.error('Maintenance logging failed:', err);
      setError(
        err?.response?.data?.message ||
          'Error logging maintenance. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ff-form">
      <div style={{ marginBottom: 4 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 4 }}>
          MAINTENANCE SERVICE
        </div>
        <h2 className="ff-modal-title">Log Maintenance</h2>
        <p className="ff-modal-subtitle">
          Record a vehicle service event. Backend automatically records current vehicle mileage and marks the vehicle AVAILABLE.
        </p>
      </div>

      {error ? (
        <div className="ff-inline-alert is-error" role="alert" style={{ marginBottom: 0 }}>
          <span>{error}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            onClick={() => setError('')}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      ) : null}

      {loadingOptions ? (
        <LoadingState
          title="Loading vehicles & technicians..."
          description="Fetching fleet vehicles and registered maintenance technicians."
        />
      ) : (
        <form onSubmit={handleSubmit} className="ff-form">
          <div className="ff-form-grid-2">
            <div className="ff-field">
              <label htmlFor="maintenance-vehicle">
                Vehicle<span className="ff-required">*</span>
              </label>
              <select
                id="maintenance-vehicle"
                className="ff-select"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.licensePlate}
                    {vehicle.model ? ` (${vehicle.model})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="ff-field">
              <label htmlFor="maintenance-technician">
                Technician<span className="ff-required">*</span>
              </label>
              <select
                id="maintenance-technician"
                className="ff-select"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="ff-field">
              <label htmlFor="maintenance-date">
                Service Date<span className="ff-required">*</span>
              </label>
              <input
                id="maintenance-date"
                type="date"
                className="ff-input ff-tabular"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="ff-field">
              <label htmlFor="maintenance-cost">
                Cost ({currencySymbol})<span className="ff-required">*</span>
              </label>
              <input
                id="maintenance-cost"
                type="number"
                className="ff-input ff-tabular"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="ff-field">
            <label htmlFor="maintenance-description">
              Description<span className="ff-required">*</span>
            </label>
            <textarea
              id="maintenance-description"
              className="ff-textarea"
              rows="3"
              placeholder="Describe the maintenance or repair work performed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="ff-form-actions">
            {onClose ? (
              <button
                type="button"
                className="ff-btn ff-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            ) : null}

            <button
              type="submit"
              className="ff-btn ff-btn-primary"
              disabled={loading || loadingOptions}
            >
              {loading ? 'Saving Record...' : 'Save Record'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
