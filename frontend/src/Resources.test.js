import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';

import { store } from './store';
import { PreferencesProvider } from './context/PreferencesContext';
import DriverList from './components/drivers/DriverList';
import MaintenanceList from './components/maintenance/MaintenanceList';

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

test('P4-1 — DriverList renders real drivers & cross-referenced trip stats for FLEET_MANAGER', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockImplementation((url) => {
    if (url === '/drivers') {
      return Promise.resolve({
        data: [
          {
            id: 1,
            licenseNumber: 'DL-TN-001',
            status: 'AVAILABLE',
            user: { id: 10, username: 'bharathi2', email: 'b2@fleet.com' },
          },
          {
            id: 2,
            licenseNumber: 'DL-TN-002',
            status: 'ON_TRIP',
            user: { id: 11, username: 'rahul2', email: 'r2@fleet.com' },
          },
        ],
      });
    }
    if (url === '/trips') {
      return Promise.resolve({
        data: [
          { id: 5, driver: { id: 1 }, vehicle: { licensePlate: '1984' }, status: 'COMPLETED', distanceCovered: 250.5 },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithProviders(<DriverList />);

  expect(await screen.findByText('bharathi2')).toBeInTheDocument();
  expect(screen.getByText('DL-TN-001')).toBeInTheDocument();
  expect(screen.getByText('250.5 km')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Add Driver/i })).toBeInTheDocument();
});

test('P4-2 — DriverList is read-only for ADMIN and blocks API calls for DRIVER role', async () => {
  setRole('ADMIN', 'admin');
  axios.get.mockResolvedValue({
    data: [
      { id: 1, licenseNumber: 'DL-ADM-1', status: 'AVAILABLE', user: { id: 10, username: 'drv_read' } },
    ],
  });

  const { unmount } = renderWithProviders(<DriverList />);
  expect(await screen.findByText('drv_read')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add Driver/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  unmount();

  jest.clearAllMocks();
  setRole('DRIVER', 'driver1');
  renderWithProviders(<DriverList />);
  expect(await screen.findByText(/Driver Directory Restricted/i)).toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
});

test('P4-3 — MaintenanceList renders INR costs, mileageAtService, and clean modal submission', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockImplementation((url) => {
    if (url === '/maintenance') {
      return Promise.resolve({
        data: [
          {
            id: 9,
            serviceDate: '2026-09-16',
            description: 'Brake Pad Replacement',
            cost: 1500,
            mileageAtService: 18420,
            vehicle: { id: 8, licensePlate: 'TN-07-MAINT', model: 'Ashok' },
            technician: { id: 4, username: 'tech1' },
          },
        ],
      });
    }
    if (url.startsWith('/vehicles')) {
      return Promise.resolve({
        data: { content: [{ id: 8, licensePlate: 'TN-07-MAINT', model: 'Ashok' }] },
      });
    }
    if (url === '/users/technicians') {
      return Promise.resolve({
        data: [{ id: 4, username: 'tech1' }],
      });
    }
    return Promise.resolve({ data: [] });
  });
  axios.post.mockResolvedValue({ data: { id: 10 } });

  renderWithProviders(<MaintenanceList />);

  expect(await screen.findByText('Brake Pad Replacement')).toBeInTheDocument();
  expect(screen.getByText(/18,420 km/i)).toBeInTheDocument();
  expect(screen.getAllByText(/₹1,500\.00/).length).toBeGreaterThanOrEqual(1);

  fireEvent.click(screen.getByRole('button', { name: /Log Maintenance/i }));
  const dialog = await screen.findByRole('dialog');
  const modal = within(dialog);
  expect(await modal.findByLabelText(/Vehicle/i)).toBeInTheDocument();
  fireEvent.change(modal.getByLabelText(/Vehicle/i), { target: { value: '8' } });
  fireEvent.change(modal.getByLabelText(/Technician/i), { target: { value: '4' } });
  fireEvent.change(modal.getByLabelText(/Cost/i), { target: { value: '500' } });
  fireEvent.change(modal.getByLabelText(/Description/i), { target: { value: 'Oil top-up' } });
  fireEvent.click(modal.getByRole('button', { name: /Save Record/i }));

  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith(
      '/maintenance/log',
      expect.objectContaining({
        vehicle: { id: 8 },
        technician: { id: 4 },
        description: 'Oil top-up',
        cost: 500,
      })
    );
  });
});

test('P4-4 — MaintenanceList restricts DRIVER and ADMIN roles with zero API calls', async () => {
  setRole('DRIVER', 'driver1');
  const { unmount } = renderWithProviders(<MaintenanceList />);
  expect(await screen.findByText(/Maintenance Access Restricted/i)).toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
  unmount();

  jest.clearAllMocks();
  setRole('ADMIN', 'admin');
  renderWithProviders(<MaintenanceList />);
  expect(await screen.findByText(/Maintenance Access Restricted/i)).toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
});
