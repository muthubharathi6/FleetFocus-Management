import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';

import { store } from './store';
import { PreferencesProvider } from './context/PreferencesContext';
import VehicleList from './components/vehicles/VehicleList';
import TripList from './components/trips/TripList';
import LiveFleet from './components/dashboard/LiveFleet';

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

test('P3-1 — VehicleList renders pagination from slice.pagination and allows ADMIN to manage vehicles', async () => {
  setRole('ADMIN', 'admin');
  axios.get.mockResolvedValue({
    data: {
      content: [
        { id: 1, vin: 'VIN001', licensePlate: 'TN-01-AA-1111', model: 'Volvo FH16', status: 'AVAILABLE', currentMileage: 14500 },
      ],
      number: 0,
      totalPages: 3,
      totalElements: 25,
      size: 10,
    },
  });

  renderWithProviders(<VehicleList />);

  expect(await screen.findByText('TN-01-AA-1111')).toBeInTheDocument();
  expect(screen.getByText(/Add Vehicle/i)).toBeInTheDocument();
  expect(screen.getByText(/25 total vehicles/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Next →/i })).toBeEnabled();
});

test('P3-2 — TripList ends an active trip via modal (never window.prompt)', async () => {
  setRole('FLEET_MANAGER', 'manager');
  const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => '999');

  axios.get.mockResolvedValue({
    data: [
      {
        id: 42,
        vehicle: { id: 8, licensePlate: 'TN-07-ZZ-4242', model: 'Ashok Leyland' },
        driver: { id: 3, user: { username: 'bharathi2' } },
        startTime: '2026-09-16T15:05:09',
        endTime: null,
        status: 'ACTIVE',
        distanceCovered: 0,
      },
    ],
  });
  axios.put.mockResolvedValue({ data: { id: 42, status: 'COMPLETED', distanceCovered: 185.5 } });

  renderWithProviders(<TripList />);

  const endBtn = await screen.findByRole('button', { name: /End Trip/i });
  fireEvent.click(endBtn);

  expect(promptSpy).not.toHaveBeenCalled();
  const distInput = await screen.findByLabelText(/Distance Covered/i);
  fireEvent.change(distInput, { target: { value: '185.5' } });
  fireEvent.click(screen.getByRole('button', { name: /Complete Trip/i }));

  await waitFor(() => {
    expect(axios.put).toHaveBeenCalledWith('/trips/42/end', { distance: 185.5 });
  });
  promptSpy.mockRestore();
});

test('P3-3 — LiveFleet shows zero dummy fallback rows on empty response and Not Available for missing fields', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockResolvedValue({ data: [] });

  renderWithProviders(<LiveFleet />);

  expect(await screen.findByText(/No Vehicles in Monitoring Feed/i)).toBeInTheDocument();
  expect(screen.queryByText('qwe-124')).not.toBeInTheDocument();
  expect(screen.queryByText('1984')).not.toBeInTheDocument();
});

test('P3-4 — LiveFleet renders Not Available when telemetry fields are null and restricts DRIVER role', async () => {
  setRole('FLEET_MANAGER', 'manager');
  axios.get.mockResolvedValue({
    data: [
      {
        vehicleId: 8,
        licensePlate: 'REAL-88',
        model: 'Tata',
        status: 'ON_TRIP',
        latitude: null,
        longitude: null,
        speed: null,
        fuelLevel: null,
      },
    ],
  });

  const { unmount } = renderWithProviders(<LiveFleet />);
  expect(await screen.findByText('REAL-88')).toBeInTheDocument();
  expect(screen.getAllByText('Not Available').length).toBeGreaterThanOrEqual(4);
  unmount();

  jest.clearAllMocks();
  setRole('DRIVER', 'driver1');
  renderWithProviders(<LiveFleet />);
  expect(await screen.findByText(/Live Fleet Access Restricted/i)).toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
});
