import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';

import { store } from './store';
import { PreferencesProvider } from './context/PreferencesContext';
import AlertsPage from './components/alerts/AlertsPage';
import SettingsPage from './components/settings/SettingsPage';

jest.mock('axios');

function setRole(role, username = 'tester') {
  localStorage.setItem('role', role);
  localStorage.setItem('username', username);
  localStorage.setItem('token', 'test-jwt');
  localStorage.setItem('user', JSON.stringify({ username, role, token: 'test-jwt' }));
  store.dispatch({
    type: 'auth/login/fulfilled',
    payload: { username, role, token: 'test-jwt' },
  });
}

function renderWithProviders(ui) {
  return render(
    <Provider store={store}>
      <PreferencesProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </PreferencesProvider>
    </Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('P6-1 — AlertsPage derives real alerts, filters by severity, and persists local acknowledgements', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, licensePlate: 'TN-07-MAINT', model: 'Ashok', status: 'UNDER_MAINTENANCE', currentMileage: 45000 },
            { id: 2, licensePlate: 'TN-01-OK', model: 'Tata', status: 'AVAILABLE', currentMileage: 5000 },
          ],
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          {
            id: 10,
            status: 'ACTIVE',
            startTime: '2026-09-16T08:00:00',
            distanceCovered: 120,
            vehicle: { id: 2, licensePlate: 'TN-01-OK' },
            driver: { id: 5, user: { username: 'driver1' } },
          },
        ],
      });
    }
    if (url === '/monitoring/live') {
      return Promise.resolve({
        data: [
          { vehicleId: 2, licensePlate: 'TN-01-OK', speed: 105, fuelLevel: 12, latitude: 13.08, longitude: 80.27 },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithProviders(<AlertsPage />);

  expect(await screen.findByText(/Overspeed Detected — TN-01-OK/i)).toBeInTheDocument();
  expect(screen.getByText(/Low Fuel Level — TN-01-OK/i)).toBeInTheDocument();
  expect(screen.getByText(/Under Maintenance — TN-07-MAINT/i)).toBeInTheDocument();
  expect(screen.getByText(/High Mileage Check — TN-07-MAINT/i)).toBeInTheDocument();
  expect(screen.getByText(/Active Trip #10 — TN-01-OK/i)).toBeInTheDocument();
  expect(screen.getByText(/Local Alert State:/i)).toBeInTheDocument();

  // Filter by critical severity
  fireEvent.click(screen.getByRole('button', { name: /Critical \(2\)/i }));
  expect(screen.getByText(/Overspeed Detected — TN-01-OK/i)).toBeInTheDocument();
  expect(screen.queryByText(/Under Maintenance — TN-07-MAINT/i)).not.toBeInTheDocument();

  // Acknowledge first visible alert locally & verify persistence in localStorage
  const ackButtons = screen.getAllByRole('button', { name: /^Acknowledge$/i });
  fireEvent.click(ackButtons[0]);

  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('fleetfocus_ack_alerts_v1') || '{}');
    expect(Object.keys(saved).length).toBe(1);
  });
  expect(screen.getAllByText(/Acknowledged \(Local\)/i).length).toBeGreaterThanOrEqual(2);
});

test('P6-2 — AlertsPage enforces RBAC for DRIVER, ADMIN, MAINTENANCE_TECH, and DISPATCHER', async () => {
  const getMock = jest.fn((url) => {
    if (url.startsWith('/vehicles')) return Promise.resolve({ data: { content: [] } });
    if (url === '/trips') return Promise.resolve({ data: [] });
    if (url === '/monitoring/live') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected call: ${url}`));
  });
  axios.get.mockImplementation(getMock);

  for (const role of ['DRIVER', 'ADMIN', 'MAINTENANCE_TECH']) {
    jest.clearAllMocks();
    setRole(role, role.toLowerCase());
    const { unmount } = renderWithProviders(<AlertsPage />);
    expect(await screen.findByText(/All Systems Nominal/i)).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalledWith('/monitoring/live');
    expect(screen.getByText('Restricted')).toBeInTheDocument();
    unmount();
  }

  jest.clearAllMocks();
  setRole('DISPATCHER', 'dispatcher');
  renderWithProviders(<AlertsPage />);
  expect(await screen.findByText(/All Systems Nominal/i)).toBeInTheDocument();
  expect(getMock).toHaveBeenCalledWith('/monitoring/live');
});

test('P6-3 — SettingsPage validates and persists preferences, theme, INR/USD currency, and thresholds', async () => {
  setRole('FLEET_MANAGER', 'manager');
  renderWithProviders(<SettingsPage />);

  // Default currency is INR (₹)
  expect(screen.getByText(/₹3,948/)).toBeInTheDocument();

  // Switch currency to USD ($) and verify persistence
  fireEvent.click(screen.getByRole('button', { name: /USD \(\$\)/i }));
  expect(screen.getByText(/\$3,948/)).toBeInTheDocument();
  const savedAfterUsd = JSON.parse(localStorage.getItem('fleetfocus_preferences_v1') || '{}');
  expect(savedAfterUsd.currency).toBe('USD');

  // Switch to Telemetry & Thresholds tab and test invalid range rejection
  fireEvent.click(screen.getByRole('tab', { name: /Telemetry & Thresholds/i }));
  const speedInput = screen.getByLabelText(/Overspeed Critical Alert Limit/i);
  fireEvent.change(speedInput, { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: /Save Thresholds/i }));
  expect(await screen.findByText(/between 40 and 200 km\/h/i)).toBeInTheDocument();

  // Save valid threshold & verify localStorage persistence
  fireEvent.change(speedInput, { target: { value: '110' } });
  fireEvent.click(screen.getByRole('button', { name: /Save Thresholds/i }));
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem('fleetfocus_preferences_v1') || '{}');
    expect(saved.overspeedThreshold).toBe(110);
  });

  // Reset defaults restores INR & 90 km/h
  fireEvent.click(screen.getByRole('button', { name: /Reset All Defaults/i }));
  await waitFor(() => {
    const reset = JSON.parse(localStorage.getItem('fleetfocus_preferences_v1') || '{}');
    expect(reset.currency).toBe('INR');
    expect(reset.overspeedThreshold).toBe(90);
  });
});

test('P6-4 — SettingsPage User Directory enforces ADMIN delete, FLEET_MANAGER read-only, and blocks restricted roles', async () => {
  const sampleUsers = [
    { id: 1, username: 'admin_user', email: 'admin@fleet.com', role: 'ADMIN' },
    { id: 2, username: 'driver_bob', email: 'bob@fleet.com', role: 'DRIVER' },
  ];

  // Restricted roles (DRIVER, DISPATCHER, MAINTENANCE_TECH) must NOT call /users
  for (const role of ['DRIVER', 'DISPATCHER', 'MAINTENANCE_TECH']) {
    jest.clearAllMocks();
    setRole(role, role.toLowerCase());
    const { unmount } = renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('tab', { name: /User Directory/i }));
    expect(await screen.findByText(/User Directory Restricted/i)).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
    unmount();
  }

  // FLEET_MANAGER: read-only (calls /users, no Delete button)
  jest.clearAllMocks();
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockResolvedValue({ data: sampleUsers });
  const { unmount: unmountMgr } = renderWithProviders(<SettingsPage />);
  fireEvent.click(screen.getByRole('tab', { name: /User Directory/i }));
  expect(await screen.findByText('driver_bob')).toBeInTheDocument();
  expect(screen.getByText(/Read-Only Directory:/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();
  unmountMgr();

  // ADMIN: can delete non-self user via ConfirmDialog -> DELETE /users/{id}
  jest.clearAllMocks();
  setRole('ADMIN', 'admin_user');
  axios.get.mockResolvedValue({ data: sampleUsers });
  axios.delete.mockResolvedValue({ data: {} });
  renderWithProviders(<SettingsPage />);
  fireEvent.click(screen.getByRole('tab', { name: /User Directory/i }));
  expect(await screen.findByText('driver_bob')).toBeInTheDocument();

  const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
  expect(deleteButtons[0]).toBeDisabled(); // self row disabled
  expect(deleteButtons[1]).not.toBeDisabled();

  fireEvent.click(deleteButtons[1]);
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /Delete User/i }));

  await waitFor(() => {
    expect(axios.delete).toHaveBeenCalledWith('/users/2');
  });
});
