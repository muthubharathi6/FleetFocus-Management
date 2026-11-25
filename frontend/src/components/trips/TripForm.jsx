import React, { useEffect, useState } from 'react';
import vehicleService from '../../services/vehicleService';
import driverService from '../../services/driverService';
import tripService from '../../services/tripService';
import { LoadingState } from '../common/StateBlocks';

export default function TripForm({ onRefresh, onClose }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      setError('');
      try {
        const [vRes, dRes] = await Promise.all([
          vehicleService.getAvailable(),
          driverService.getAvailable(),
        ]);

        setVehicles(Array.isArray(vRes?.data) ? vRes.data : []);
        setDrivers(Array.isArray(dRes?.data) ? dRes.data : []);
      } catch (err) {
        console.error('Failed to load dispatch options:', err);
        setError(
          err?.response?.data?.message ||
            'Unable to load available vehicles and drivers.'
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vehicleId) {
      setError('Please select an available vehicle.');
      return;
    }

    if (!driverId) {
      setError('Please select an available driver.');
      return;
    }

    setLoading(true);
    try {
      await tripService.start({
        vehicleId: parseInt(vehicleId, 10),
        driverId: parseInt(driverId, 10),
      });

      if (onRefresh) await onRefresh();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error dispatching trip:', err);
      setError(
        err?.response?.data?.message ||
          'Error dispatching trip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(
    (vehicle) => String(vehicle.id) === String(vehicleId)
  );
  const selectedDriver = drivers.find(
    (driver) => String(driver.id) === String(driverId)
  );

  return (
    <div className="ff-form">
      <div style={{ marginBottom: 4 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 4 }}>
          TRIP DISPATCH
        </div>
        <h2 className="ff-modal-title">Dispatch Vehicle</h2>
        <p className="ff-modal-subtitle">
          Assign an available vehicle and driver to initiate a new trip.
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
          title="Checking availability..."
          description="Loading available vehicles and drivers from backend."
        />
      ) : (
        <form onSubmit={handleSubmit} className="ff-form">
          <div className="ff-field">
            <label htmlFor="trip-vehicle">
              Available Vehicle<span className="ff-required">*</span>
            </label>
            <select
              id="trip-vehicle"
              className="ff-select"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.model
                    ? `${vehicle.licensePlate} — ${vehicle.model}`
                    : vehicle.licensePlate}
                </option>
              ))}
            </select>
            {vehicles.length === 0 ? (
              <span className="ff-field-help" style={{ color: 'var(--ff-warning)' }}>
                No vehicles currently have AVAILABLE status.
              </span>
            ) : null}
          </div>

          <div className="ff-field">
            <label htmlFor="trip-driver">
              Available Driver<span className="ff-required">*</span>
            </label>
            <select
              id="trip-driver"
              className="ff-select"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.user?.username || `Driver #${driver.id}`}
                  {driver.licenseNumber ? ` (${driver.licenseNumber})` : ''}
                </option>
              ))}
            </select>
            {drivers.length === 0 ? (
              <span className="ff-field-help" style={{ color: 'var(--ff-warning)' }}>
                No drivers currently have AVAILABLE status.
              </span>
            ) : null}
          </div>

          {(vehicleId || driverId) ? (
            <div className="ff-summary-box">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ff-cyan-bright)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Dispatch Preview
              </div>
              <div className="ff-detail-grid">
                <div className="ff-detail-item">
                  <span className="ff-detail-label">Vehicle</span>
                  <span className="ff-detail-value">
                    {selectedVehicle?.licensePlate || 'Not selected'}
                  </span>
                </div>
                <div className="ff-detail-item">
                  <span className="ff-detail-label">Driver</span>
                  <span className="ff-detail-value">
                    {selectedDriver?.user?.username || 'Not selected'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="ff-form-actions">
            <button
              type="button"
              className="ff-btn ff-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ff-btn ff-btn-primary"
              disabled={loading || loadingOptions || !vehicleId || !driverId}
            >
              {loading ? 'Starting Trip...' : 'Start Trip'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
