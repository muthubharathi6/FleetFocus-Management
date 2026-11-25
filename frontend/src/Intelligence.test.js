import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';

import { store } from './store';
import { PreferencesProvider } from './context/PreferencesContext';
import FuelExpensesPage from './components/expenses/FuelExpensesPage';
import AnalyticsReportsPage from './components/reports/AnalyticsReportsPage';
import { buildCsvContent } from './utils/csvExport';

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

let anchorClickSpy;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.URL.createObjectURL = jest.fn(() => 'blob:mock-csv');
  window.URL.revokeObjectURL = jest.fn();
  window.print = jest.fn();
  anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  if (anchorClickSpy) anchorClickSpy.mockRestore();
});

test('P5-1 — FuelExpensesPage renders real INR maintenance spend, transparency banner, offline fuel telemetry, filtering & CSV export', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, licensePlate: 'tn7', model: 'Ashok Leyland', status: 'AVAILABLE', currentMileage: 1800 },
            { id: 2, licensePlate: '1984', model: 'Tata Prima', status: 'ON_TRIP', currentMileage: 1200 },
          ],
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          { id: 10, status: 'COMPLETED', distanceCovered: 2000, startTime: '2026-09-16T10:00:00', vehicle: { id: 1, licensePlate: 'tn7' } },
          { id: 11, status: 'COMPLETED', distanceCovered: 2018, startTime: '2026-09-17T10:00:00', vehicle: { id: 2, licensePlate: '1984' } },
        ],
      });
    }
    if (url === '/maintenance') {
      return Promise.resolve({
        data: [
          {
            id: 101,
            serviceDate: '2026-07-10',
            description: 'Engine oil change',
            cost: 400,
            mileageAtService: 1000,
            vehicle: { id: 2, licensePlate: '1984', model: 'Tata Prima' },
            technician: { id: 4, username: 'tech1' },
          },
          {
            id: 102,
            serviceDate: '2026-09-15',
            description: 'Full brake overhaul',
            cost: 3548,
            mileageAtService: 1800,
            vehicle: { id: 1, licensePlate: 'tn7', model: 'Ashok Leyland' },
            technician: { id: 4, username: 'tech1' },
          },
        ],
      });
    }
    if (url === '/monitoring/live') {
      return Promise.resolve({
        data: [
          { vehicleId: 1, licensePlate: 'tn7', model: 'Ashok Leyland', status: 'AVAILABLE', fuelLevel: null },
          { vehicleId: 2, licensePlate: '1984', model: 'Tata Prima', status: 'ON_TRIP', fuelLevel: null },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithProviders(<FuelExpensesPage />);

  expect(await screen.findByText('Full brake overhaul')).toBeInTheDocument();
  expect(screen.getByText(/Data Transparency:/i)).toBeInTheDocument();
  expect(screen.getAllByText(/₹3,948\.00/).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/₹0\.98\/km/)).toBeInTheDocument();
  expect(screen.getByText(/Jul 2026 \(1 log\)/i)).toBeInTheDocument();
  expect(screen.getByText(/Sep 2026 \(1 log\)/i)).toBeInTheDocument();
  expect(screen.getAllByText('Not Available').length).toBeGreaterThanOrEqual(2);

  // Filter ledger by search
  fireEvent.change(screen.getByPlaceholderText(/Search plate, description, or technician/i), {
    target: { value: 'brake' },
  });
  expect(screen.getByText('Full brake overhaul')).toBeInTheDocument();
  expect(screen.queryByText('Engine oil change')).not.toBeInTheDocument();

  // Trigger CSV export
  fireEvent.click(screen.getByRole('button', { name: /Export Ledger CSV/i }));
  expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-csv');
});

test('P5-2 — FuelExpensesPage enforces backend RBAC for DRIVER and ADMIN with zero unauthorized requests', async () => {
  const getMock = jest.fn((url) => {
    if (url.startsWith('/vehicles')) return Promise.resolve({ data: { content: [] } });
    if (url === '/trips') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unauthorized call to ${url}`));
  });
  axios.get.mockImplementation(getMock);

  setRole('DRIVER', 'driver1');
  const { unmount } = renderWithProviders(<FuelExpensesPage />);
  expect(await screen.findByText(/Expenditure Breakdown Restricted/i)).toBeInTheDocument();
  expect(screen.getByText(/Fuel Telemetry Restricted/i)).toBeInTheDocument();
  expect(screen.getByText(/Expense Ledger Restricted/i)).toBeInTheDocument();
  expect(getMock).not.toHaveBeenCalledWith('/maintenance');
  expect(getMock).not.toHaveBeenCalledWith('/monitoring/live');
  unmount();

  jest.clearAllMocks();
  setRole('ADMIN', 'admin');
  renderWithProviders(<FuelExpensesPage />);
  expect(await screen.findByText(/Expenditure Breakdown Restricted/i)).toBeInTheDocument();
  expect(screen.getByText(/Fuel Telemetry Restricted/i)).toBeInTheDocument();
  expect(getMock).not.toHaveBeenCalledWith('/maintenance');
  expect(getMock).not.toHaveBeenCalledWith('/monitoring/live');
});

test('P5-3 — AnalyticsReportsPage computes real utilization, timeframe filters, leaderboards, CSV export & print', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockImplementation((url) => {
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: {
          content: [
            { id: 1, licensePlate: 'tn7', model: 'Ashok', vin: 'V1', status: 'ON_TRIP', currentMileage: 1800 },
            { id: 2, licensePlate: '1984', model: 'Tata', vin: 'V2', status: 'AVAILABLE', currentMileage: 900 },
          ],
        },
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          {
            id: 1,
            status: 'COMPLETED',
            startTime: '2026-09-15T08:00:00',
            endTime: '2026-09-15T12:00:00',
            distanceCovered: 150.5,
            vehicle: { id: 1, licensePlate: 'tn7' },
            driver: { id: 7, user: { username: 'bharathi2' } },
          },
        ],
      });
    }
    if (url === '/maintenance') {
      return Promise.resolve({
        data: [
          {
            id: 21,
            serviceDate: '2026-09-15',
            description: 'Tire check',
            cost: 1200,
            mileageAtService: 1750,
            vehicle: { id: 1, licensePlate: 'tn7' },
            technician: { id: 4, username: 'tech1' },
          },
        ],
      });
    }
    if (url === '/drivers') {
      return Promise.resolve({
        data: [
          { id: 7, licenseNumber: 'DL-007', status: 'ON_TRIP', user: { username: 'bharathi2', email: 'b2@fleet.com' } },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithProviders(<AnalyticsReportsPage />);

  expect(await screen.findByText('bharathi2')).toBeInTheDocument();
  expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('150.5 km').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/₹1,200\.00/).length).toBeGreaterThanOrEqual(1);

  // Switch timeframe to 7D (historical Sep 2026 trip should be excluded honestly)
  fireEvent.click(screen.getByRole('tab', { name: '7D' }));
  await waitFor(() => {
    expect(screen.getByText(/No Trips in Last 7D/i)).toBeInTheDocument();
  });

  // Switch back to All Time & test CSV export + Print/PDF
  fireEvent.click(screen.getByRole('tab', { name: 'All Time' }));
  expect(await screen.findByText(/Trip Activity by Month \(All Time\)/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Export Vehicles CSV/i }));
  fireEvent.click(screen.getByRole('button', { name: /Export Trips CSV/i }));
  fireEvent.click(screen.getByRole('button', { name: /Export Maintenance CSV/i }));
  fireEvent.click(screen.getByRole('button', { name: /Export Drivers CSV/i }));
  expect(window.URL.createObjectURL).toHaveBeenCalledTimes(4);

  fireEvent.click(screen.getByRole('button', { name: /Print \/ PDF/i }));
  expect(window.print).toHaveBeenCalledTimes(1);
});

test('P5-4 — AnalyticsReportsPage enforces RBAC for DRIVER & ADMIN and csvExport escapes RFC-4180 characters', async () => {
  const csv = buildCsvContent(
    [
      { label: 'Plate', key: 'plate' },
      { label: 'Notes', key: 'notes' },
    ],
    [{ plate: 'TN-07', notes: 'Brake, "front" pad\nchecked' }]
  );
  expect(csv).toBe('Plate,Notes\r\nTN-07,"Brake, ""front"" pad\nchecked"');

  const getMock = jest.fn((url) => {
    if (url.startsWith('/vehicles')) return Promise.resolve({ data: { content: [] } });
    if (url === '/trips') return Promise.resolve({ data: [] });
    if (url === '/drivers') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unauthorized call to ${url}`));
  });
  axios.get.mockImplementation(getMock);

  setRole('DRIVER', 'driver1');
  const { unmount } = renderWithProviders(<AnalyticsReportsPage />);
  expect(await screen.findByText(/Driver Analytics Restricted/i)).toBeInTheDocument();
  expect(getMock).not.toHaveBeenCalledWith('/maintenance');
  expect(getMock).not.toHaveBeenCalledWith('/drivers');
  expect(screen.getByRole('button', { name: /Export Maintenance CSV/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Export Drivers CSV/i })).toBeDisabled();
  unmount();

  jest.clearAllMocks();
  setRole('ADMIN', 'admin');
  renderWithProviders(<AnalyticsReportsPage />);
  await waitFor(() => {
    expect(getMock).toHaveBeenCalledWith('/drivers');
  });
  expect(getMock).not.toHaveBeenCalledWith('/maintenance');
  expect(screen.getByRole('button', { name: /Export Maintenance CSV/i })).toBeDisabled();
});
