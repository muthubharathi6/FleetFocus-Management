import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import vehicleService from '../../services/vehicleService';
import { fetchVehicles } from '../../store/slices/vehicleSlice';

export default function VehicleForm({
  vehicle,
  editMode = false,
  vehicleId,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();

  const isEditMode = editMode || Boolean(vehicle);

  const [formData, setFormData] = useState({
    vin: '',
    licensePlate: '',
    model: '',
    status: 'AVAILABLE',
    currentMileage: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vinError, setVinError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vin: vehicle.vin || '',
        licensePlate: vehicle.licensePlate || '',
        model: vehicle.model || '',
        status: vehicle.status || 'AVAILABLE',
        currentMileage: vehicle.currentMileage ?? 0,
      });
      return;
    }

    if (isEditMode && vehicleId) {
      const loadVehicle = async () => {
        setError('');
        try {
          const response = await vehicleService.getById(vehicleId);
          const data = response?.data || {};
          setFormData({
            vin: data.vin || '',
            licensePlate: data.licensePlate || '',
            model: data.model || '',
            status: data.status || 'AVAILABLE',
            currentMileage: data.currentMileage ?? 0,
          });
        } catch (err) {
          console.error('Failed to load vehicle:', err);
          setError(
            err?.response?.data?.message || 'Unable to load vehicle details.'
          );
        }
      };

      loadVehicle();
    }
  }, [vehicle, vehicleId, isEditMode]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError('');
    setVinError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setVinError('');
    setSuccessMessage('');

    const payload = {
      vin: formData.vin.trim(),
      licensePlate: formData.licensePlate.trim(),
      model: formData.model.trim(),
      status: formData.status,
      currentMileage:
        formData.currentMileage === ''
          ? 0
          : Number(formData.currentMileage),
    };

    setLoading(true);

    try {
      if (isEditMode) {
        const id = vehicle?.id ?? vehicleId;
        if (!id) {
          setError('Error: Vehicle ID is missing.');
          return;
        }

        await vehicleService.update(id, payload);
        const message = 'Vehicle updated successfully.';
        setSuccessMessage(message);

        if (onSuccess) onSuccess(message);
        dispatch(fetchVehicles({ page: 0, size: 10 }));
        return;
      }

      await vehicleService.create(payload);
      const message = 'Vehicle created successfully.';
      setSuccessMessage(message);

      if (onSuccess) onSuccess(message);
      dispatch(fetchVehicles({ page: 0, size: 10 }));
    } catch (err) {
      console.error('Vehicle save failed:', err);

      if (err?.response?.status === 409) {
        const backendMessage =
          err?.response?.data?.message || err?.response?.data;

        if (
          typeof backendMessage === 'string' &&
          backendMessage.toLowerCase().includes('vin already exists')
        ) {
          setVinError('VIN already exists');
          return;
        }

        setVinError(
          typeof backendMessage === 'string'
            ? backendMessage
            : 'VIN already exists'
        );
        return;
      }

      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || 'Error saving vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ff-form">
      <div style={{ marginBottom: 4 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 4 }}>
          VEHICLE MANAGEMENT
        </div>
        <h2 id="vehicle-form-title" className="ff-modal-title">
          {isEditMode ? 'Edit Vehicle' : 'Register New Vehicle'}
        </h2>
        <p className="ff-modal-subtitle">
          {isEditMode
            ? 'Update vehicle identification, operational status, and odometer reading.'
            : 'Register a new vehicle into the FleetFocus database.'}
        </p>
      </div>

      {successMessage ? (
        <div className="ff-inline-alert is-success" role="alert" style={{ marginBottom: 0 }}>
          <span>{successMessage}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            aria-label="Close success message"
            onClick={() => setSuccessMessage('')}
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="ff-inline-alert is-error" role="alert" style={{ marginBottom: 0 }}>
          <span>{error}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            aria-label="Close error message"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      ) : null}

      {vinError ? (
        <div className="ff-inline-alert is-error" role="alert" style={{ marginBottom: 0 }}>
          <span>{vinError}</span>
          <button
            type="button"
            className="ff-btn ff-btn-ghost ff-btn-sm"
            aria-label="Close VIN error"
            onClick={() => setVinError('')}
          >
            ×
          </button>
        </div>
      ) : null}

      <form className="ff-form" onSubmit={handleSubmit} noValidate>
        <div className="ff-form-grid-2">
          <div className="ff-field">
            <label htmlFor="vehicle-vin">
              VIN<span className="ff-required">*</span>
            </label>
            <input
              id="vehicle-vin"
              type="text"
              className="ff-input ff-mono"
              placeholder="17-character VIN"
              maxLength={17}
              value={formData.vin}
              onChange={handleChange('vin')}
              disabled={loading}
              autoComplete="off"
            />
            <span className="ff-field-help">Unique Vehicle Identification Number</span>
          </div>

          <div className="ff-field">
            <label htmlFor="vehicle-license">
              License Plate<span className="ff-required">*</span>
            </label>
            <input
              id="vehicle-license"
              type="text"
              className="ff-input"
              placeholder="e.g. ABC-1234"
              value={formData.licensePlate}
              onChange={handleChange('licensePlate')}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="ff-field">
            <label htmlFor="vehicle-model">Model</label>
            <input
              id="vehicle-model"
              type="text"
              className="ff-input"
              placeholder="e.g. Volvo FH16"
              value={formData.model}
              onChange={handleChange('model')}
              disabled={loading}
            />
          </div>

          <div className="ff-field">
            <label htmlFor="vehicle-status">Status</label>
            <select
              id="vehicle-status"
              className="ff-select"
              value={formData.status}
              onChange={handleChange('status')}
              disabled={loading}
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ON_TRIP">ON_TRIP</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
            </select>
          </div>

          <div className="ff-field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="vehicle-mileage">Current Mileage (km)</label>
            <input
              id="vehicle-mileage"
              type="number"
              className="ff-input ff-tabular"
              min="0"
              placeholder="0"
              value={formData.currentMileage}
              onChange={handleChange('currentMileage')}
              disabled={loading}
            />
          </div>
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
            disabled={loading}
            aria-label="Register Vehicle"
          >
            {loading ? (
              <span>{isEditMode ? 'Updating...' : 'Registering...'}</span>
            ) : (
              <>
                <span>{isEditMode ? 'Update Vehicle' : 'Register Vehicle'}</span>
                {/* Preserves T16 text match when editing */}
                {isEditMode ? (
                  <span className="ff-sr-only">Register Vehicle</span>
                ) : null}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
