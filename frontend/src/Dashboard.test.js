import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';

import { store } from './store';
import { PreferencesProvider } from './context/PreferencesContext';
import DashboardPage from './components/dashboard/DashboardPage';

jest.mock('axios');

function renderDashboard(role, username = 'tester') {
  localStorage.setItem('role', role);
  localStorage.setItem('username', username);
  localStorage.setItem('token', 'test-jwt');
  localStorage.setItem('user', JSON.stringify({ username, role, token: 'test-jwt' }));

  store.dispatch({
    type: 'auth/login/fulfilled',
    payload: { username, role, token: 'test-jwt' },
  });

  return render(
    <Provider store={store}>
      <PreferencesProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </PreferencesProvider>
    </Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('D1 — FLEET_MANAGER renders real backend values and zero hardcoded mock strings', async () => {
  const nowIso = new Date().toISOString();

  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, vin: 'VIN1', licensePlate: 'KA-01-AA-1111', model: 'Tata Prima', status: 'AVAILABLE', currentMileage: 12000 },
            { id: 2, vin: 'VIN2', licensePlate: 'KA-02-BB-2222', model: 'Volvo FH16', status: 'ON_TRIP', currentMileage: 55000 },
            { id: 3, vin: 'VIN3', licensePlate: 'KA-03-CC-3333', model: 'Ashok Leyland', status: 'UNDER_MAINTENANCE', currentMileage: 28000 },
          ],
          totalElements: 3,
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          {
            id: 101,
            vehicle: { id: 2, licensePlate: 'KA-02-BB-2222', model: 'Volvo FH16' },
            driver: { id: 1, user: { username: 'driver1' } },
            startTime: nowIso,
            status: 'ACTIVE',
            distanceCovered: 145.5,
          },
          {
            id: 102,
            vehicle: { id: 1, licensePlate: 'KA-01-AA-1111', model: 'Tata Prima' },
            driver: { id: 1, user: { username: 'driver1' } },
            startTime: nowIso,
            status: 'COMPLETED',
            distanceCovered: 300.0,
          },
        ],
      });
    }
    if (url === '/maintenance') {
      return Promise.resolve({
        data: [
          {
            id: 501,
            vehicle: { id: 3, licensePlate: 'KA-03-CC-3333', model: 'Ashok Leyland' },
            technician: { id: 5, username: 'tech1' },
            serviceDate: '2026-11-20',
            description: 'Clutch Overhaul',
            cost: 12500,
          },
        ],
      });
    }
    if (url === '/monitoring/live') {
      return Promise.resolve({
        data: [
          {
            vehicleId: 2,
            licensePlate: 'KA-02-BB-2222',
            model: 'Volvo FH16',
            status: 'ON_TRIP',
            latitude: 13.08,
            longitude: 80.27,
            speed: 96.4,
            fuelLevel: 18,
          },
        ],
      });
    }
    if (url === '/drivers') {
      return Promise.resolve({
        data: [
          { id: 1, licenseNumber: 'DL-001', status: 'ON_TRIP', user: { username: 'driver1' } },
          { id: 2, licenseNumber: 'DL-002', status: 'AVAILABLE', user: { username: 'driver2' } },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderDashboard('FLEET_MANAGER', 'manager');

  expect(await screen.findByText(/Clutch Overhaul/i)).toBeInTheDocument();
  expect(screen.getAllByText(/445\.5 km/i).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/Overspeed Detected — KA-02-BB-2222/i)).toBeInTheDocument();
  expect(screen.getByText(/Low Fuel Level — KA-02-BB-2222/i)).toBeInTheDocument();
  expect(screen.getByText(/1 of 3 fleet vehicles are currently on trip \(33% utilization\)/i)).toBeInTheDocument();

  // Confirm zero legacy dummy strings exist
  expect(screen.queryByText(/TN01AB1234/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/KL07CD5678/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/4,52,000/)).not.toBeInTheDocument();
  expect(screen.queryByText(/1,284/)).not.toBeInTheDocument();
  expect(screen.queryByText(/increased by 8%/i)).not.toBeInTheDocument();
});

test('D2 — DRIVER role never calls restricted endpoints (/maintenance, /monitoring/live, /drivers)', async () => {
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, licensePlate: 'DRV-001', model: 'Eicher Pro', status: 'AVAILABLE', currentMileage: 8000 },
          ],
          totalElements: 1,
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          {
            id: 77,
            vehicle: { id: 1, licensePlate: 'DRV-001', model: 'Eicher Pro' },
            driver: { id: 9, user: { username: 'driver1' } },
            startTime: new Date().toISOString(),
            status: 'ACTIVE',
            distanceCovered: 42.0,
          },
        ],
      });
    }
    return Promise.reject({ response: { status: 403 } });
  });

  renderDashboard('DRIVER', 'driver1');

  expect((await screen.findAllByText(/42\.0 km/i)).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/Telemetry Restricted/i)).toBeInTheDocument();
  expect(screen.getByText(/Expenditure Restricted/i)).toBeInTheDocument();

  const calledUrls = axios.get.mock.calls.map(([u]) => u);
  expect(calledUrls.some((u) => u.startsWith('/vehicles'))).toBe(true);
  expect(calledUrls).toContain('/trips');
  expect(calledUrls).not.toContain('/maintenance');
  expect(calledUrls).not.toContain('/monitoring/live');
  expect(calledUrls).not.toContain('/drivers');
});

test('D3 — ADMIN role calls permitted endpoints (/vehicles, /trips, /drivers) and skips /maintenance & /monitoring/live', async () => {
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, licensePlate: 'ADM-100', model: 'BharatBenz', status: 'AVAILABLE', currentMileage: 5000 },
            { id: 2, licensePlate: 'ADM-200', model: 'Scania R500', status: 'ON_TRIP', currentMileage: 9000 },
          ],
          totalElements: 2,
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({ data: [] });
    }
    if (url === '/drivers') {
      return Promise.resolve({
        data: [
          { id: 1, licenseNumber: 'DL-900', status: 'AVAILABLE', user: { username: 'driver1' } },
        ],
      });
    }
    return Promise.reject({ response: { status: 403 } });
  });

  renderDashboard('ADMIN', 'admin');

  expect(await screen.findByText(/Telemetry Restricted/i)).toBeInTheDocument();
  expect(screen.getByText(/Expenditure Restricted/i)).toBeInTheDocument();

  const calledUrls = axios.get.mock.calls.map(([u]) => u);
  expect(calledUrls.some((u) => u.startsWith('/vehicles'))).toBe(true);
  expect(calledUrls).toContain('/trips');
  expect(calledUrls).toContain('/drivers');
  expect(calledUrls).not.toContain('/maintenance');
  expect(calledUrls).not.toContain('/monitoring/live');
});

test('D4 — Empty backend responses render honest zero & empty states without dummy fallbacks', async () => {
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({ data: { content: [], totalElements: 0 } });
    }
    return Promise.resolve({ data: [] });
  });

  renderDashboard('FLEET_MANAGER', 'manager');

  expect(await screen.findByRole('heading', { name: /No Vehicles Registered/i })).toBeInTheDocument();
  expect(screen.getByText(/No Maintenance Logs Yet/i)).toBeInTheDocument();
  expect(screen.getByText(/No Expenditure Logged/i)).toBeInTheDocument();
  expect(screen.getByText(/No Active Alerts/i)).toBeInTheDocument();
  expect(screen.queryByText('128')).not.toBeInTheDocument();
});

test('D5 — Backend failure renders error state with retry action instead of fake numbers', async () => {
  axios.get.mockRejectedValue(new Error('Network unavailable'));

  renderDashboard('FLEET_MANAGER', 'manager');

  await waitFor(() => {
    expect(screen.getByText(/Unable to load vehicle KPIs/i)).toBeInTheDocument();
  });
  expect(screen.getAllByRole('button', { name: /Retry/i }).length).toBeGreaterThan(0);
});

test('D6 — Dashboard values dynamically reflect updated backend responses on refresh', async () => {
  let callCycle = 0;

  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content:
            callCycle === 0
              ? [{ id: 1, licensePlate: 'DYN-1', model: 'Volvo', status: 'AVAILABLE', currentMileage: 1000 }]
              : [
                  { id: 1, licensePlate: 'DYN-1', model: 'Volvo', status: 'ON_TRIP', currentMileage: 1500 },
                  { id: 2, licensePlate: 'DYN-2', model: 'Tata', status: 'ON_TRIP', currentMileage: 2500 },
                ],
          totalElements: callCycle === 0 ? 1 : 2,
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data:
          callCycle === 0
            ? []
            : [
                {
                  id: 10,
                  vehicle: { id: 1, licensePlate: 'DYN-1' },
                  driver: { id: 1, user: { username: 'driver1' } },
                  startTime: new Date().toISOString(),
                  status: 'ACTIVE',
                  distanceCovered: 88.5,
                },
              ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderDashboard('FLEET_MANAGER', 'manager');

  expect(await screen.findByText(/0 of 1 fleet vehicles are currently on trip \(0% utilization\)/i)).toBeInTheDocument();

  callCycle = 1;
  fireEvent.click(screen.getByRole('button', { name: /Refresh Data/i }));

  expect(await screen.findByText(/2 of 2 fleet vehicles are currently on trip \(100% utilization\)/i)).toBeInTheDocument();
  expect(screen.getAllByText(/88\.5 km/i).length).toBeGreaterThanOrEqual(2);
});
