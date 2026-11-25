import React, { useEffect, useMemo, useState } from 'react';
import driverService from '../../services/driverService';
import userService from '../../services/userService';
import { LoadingState } from '../common/StateBlocks';

export default function DriverForm({
  driver = null,
  existingDrivers = [],
  onSuccess,
  onClose,
}) {
  const isEditMode = Boolean(driver);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(!isEditMode);

  const [userId, setUserId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState(driver?.licenseNumber || '');
  const [status, setStatus] = useState(driver?.status || 'AVAILABLE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      setLicenseNumber(driver?.licenseNumber || '');
      setStatus(driver?.status || 'AVAILABLE');
      setLoadingUsers(false);
      return;
    }

    const loadUsers = async () => {
      setLoadingUsers(true);
      setError('');
      try {
        const res = await userService.getAll();
        setUsers(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load users for driver profile:', err);
        setError(
          err?.response?.data?.message ||
            'Unable to load eligible users for driver creation.'
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [driver, isEditMode]);

  // Only users without an existing Driver profile can be linked (@OneToOne constraint)
  const eligibleUsers = useMemo(() => {
    const linkedIds = new Set(
      existingDrivers
        .map((d) => d?.user?.id)
        .filter((id) => id !== null && id !== undefined)
    );
    return users.filter(
      (u) =>
        String(u?.role || '').toUpperCase() === 'DRIVER' &&
        !linkedIds.has(u.id)
    );
  }, [users, existingDrivers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedLicense = licenseNumber.trim();
    if (!isEditMode && !userId) {
      setError('Please select a registered user account with DRIVER role.');
      return;
    }

    if (!trimmedLicense) {
      setError('Please enter a valid driver license number.');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await driverService.update(driver.id, {
          licenseNumber: trimmedLicense,
          status,
        });
        if (onSuccess) {
          onSuccess('Driver profile updated successfully.');
        }
      } else {
        await driverService.create({
          userId: Number(userId),
          licenseNumber: trimmedLicense,
          status,
        });
        if (onSuccess) {
          onSuccess('Driver profile created successfully.');
        }
      }
    } catch (err) {
      console.error('Failed to save driver profile:', err);
      const backendMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null);
      setError(
        backendMsg || 'Unable to save driver profile. License number may already exist.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ff-form">
      <div style={{ marginBottom: 4 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 4 }}>
          DRIVER MANAGEMENT
        </div>
        <h2 className="ff-modal-title">
          {isEditMode ? 'Edit Driver Profile' : 'Add Driver Profile'}
        </h2>
        <p className="ff-modal-subtitle">
          {isEditMode
            ? `Update license details and availability for ${driver?.user?.username || 'driver'}.`
            : 'Link an existing DRIVER user account to a fleet license profile.'}
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

      {loadingUsers ? (
        <LoadingState
          title="Loading eligible users..."
          description="Checking registered DRIVER user accounts."
        />
      ) : (
        <form onSubmit={handleSubmit} className="ff-form">
          {isEditMode ? (
            <div className="ff-summary-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ff-text-muted)' }}>Linked User</span>
                <strong>{driver?.user?.username || 'Unknown'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ff-text-muted)' }}>Email</span>
                <span>{driver?.user?.email || 'Not Available'}</span>
              </div>
            </div>
          ) : (
            <div className="ff-field">
              <label htmlFor="driver-user">
                Driver User Account<span className="ff-required">*</span>
              </label>
              <select
                id="driver-user"
                className="ff-select"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a registered DRIVER user</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
              </select>
              {eligibleUsers.length === 0 ? (
                <span className="ff-field-help" style={{ color: 'var(--ff-warning)' }}>
                  All registered DRIVER user accounts already have driver profiles. Register a new DRIVER user first.
                </span>
              ) : (
                <span className="ff-field-help">
                  Showing registered DRIVER accounts not yet linked to a license profile.
                </span>
              )}
            </div>
          )}

          <div className="ff-form-grid-2">
            <div className="ff-field">
              <label htmlFor="driver-license">
                License Number<span className="ff-required">*</span>
              </label>
              <input
                id="driver-license"
                type="text"
                className="ff-input ff-mono"
                placeholder="e.g. DL-2026-9988"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="ff-field">
              <label htmlFor="driver-status">Operational Status</label>
              <select
                id="driver-status"
                className="ff-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ON_TRIP">ON_TRIP</option>
                <option value="OFF_DUTY">OFF_DUTY</option>
              </select>
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
              disabled={loading || (!isEditMode && eligibleUsers.length === 0)}
            >
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Driver'
                  : 'Create Driver'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
