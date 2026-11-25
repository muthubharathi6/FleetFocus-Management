import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { usePreferences } from './context/PreferencesContext';
import Navbar from './components/layout/Navbar';

import Login from './components/Login';
import Register from './components/Register';

import VehicleList from './components/vehicles/VehicleList';
import TripList from './components/trips/TripList';
import DriverList from './components/drivers/DriverList';
import MaintenanceList from './components/maintenance/MaintenanceList';
import FuelExpensesPage from './components/expenses/FuelExpensesPage';
import AnalyticsReportsPage from './components/reports/AnalyticsReportsPage';
import AlertsPage from './components/alerts/AlertsPage';
import SettingsPage from './components/settings/SettingsPage';

import DashboardPage from './components/dashboard/DashboardPage';
import LiveFleet from './components/dashboard/LiveFleet';

function ProtectedLayout({ children }) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const { preferences } = usePreferences();

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  const shellClasses = [
    'app-layout',
    'ff-shell',
    preferences.sidebarCollapsed ? 'ff-sidebar-collapsed' : '',
    preferences.compactTables ? 'ff-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClasses}>
      <Navbar />
      <div className="main-content-area">{children}</div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected pages (All 10 FleetFocus Enterprise Modules) */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedLayout>
            <VehicleList />
          </ProtectedLayout>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedLayout>
            <TripList />
          </ProtectedLayout>
        }
      />

      <Route
        path="/live"
        element={
          <ProtectedLayout>
            <LiveFleet />
          </ProtectedLayout>
        }
      />

      <Route
        path="/drivers"
        element={
          <ProtectedLayout>
            <DriverList />
          </ProtectedLayout>
        }
      />

      <Route
        path="/maintenance"
        element={
          <ProtectedLayout>
            <MaintenanceList />
          </ProtectedLayout>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedLayout>
            <FuelExpensesPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedLayout>
            <AnalyticsReportsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/alerts"
        element={
          <ProtectedLayout>
            <AlertsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <SettingsPage />
          </ProtectedLayout>
        }
      />

      {/* Unknown URL */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
