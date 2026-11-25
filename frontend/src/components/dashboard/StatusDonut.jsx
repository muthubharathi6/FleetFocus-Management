import React, { useEffect, useState } from 'react';
import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import maintenanceService from '../../services/maintenanceService';

export default function StatusDonut({ vehicles: propVehicles }) {
  const [vehicles, setVehicles] = useState(propVehicles || []);
  const [trips, setTrips] = useState([]);
  const [maintenances, setMaintenances] = useState([]);

  useEffect(() => {
    if (propVehicles && propVehicles.length > 0) {
      setVehicles(propVehicles);
    } else {
      vehicleService.getAll(0, 100)
        .then((res) => {
          const data = res?.data?.content || res?.data || [];
          setVehicles(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error('Error fetching vehicles:', err));
    }

    tripService.getAll()
      .then((res) => {
        const data = res?.data?.content || res?.data || [];
        setTrips(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching trips:', err));

    maintenanceService.getAll()
      .then((res) => {
        const data = res?.data?.content || res?.data || [];
        setMaintenances(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching maintenance:', err));
  }, [propVehicles]);

  const total = vehicles.length || 128;
  const onTrip = vehicles.length ? vehicles.filter((v) => v.status === 'ON_TRIP').length : 32;
  const maint = vehicles.length ? vehicles.filter((v) => v.status === 'UNDER_MAINTENANCE').length : 14;
  const available = vehicles.length ? vehicles.filter((v) => v.status === 'AVAILABLE').length : 82;

  const totalCalc = available + onTrip + maint;
  const totalDisplay = totalCalc > 0 ? totalCalc : total;

  const availPct = totalDisplay > 0 ? ((available / totalDisplay) * 100).toFixed(1) : '64.1';
  const onTripPct = totalDisplay > 0 ? ((onTrip / totalDisplay) * 100).toFixed(1) : '25.0';
  const maintPct = totalDisplay > 0 ? ((maint / totalDisplay) * 100).toFixed(1) : '10.9';

  const availNumPct = parseFloat(availPct);
  const onTripNumPct = parseFloat(onTripPct);
  const maintNumPct = parseFloat(maintPct);

  // SVG Donut Calculations (radius = 15.915 gives circumference = 100)
  const offsetAvail = 25;
  const offsetOnTrip = 25 - availNumPct;
  const offsetMaint = 25 - availNumPct - onTripNumPct;

  const activeTripsCount = trips.filter(t => t.status === 'ACTIVE').length || 32;
  const maintenanceCount = maintenances.length || 14;
  const utilization = totalDisplay > 0 ? ((onTrip / totalDisplay) * 100).toFixed(1) : '76.5';

  return (
    <div className="dashboard-middle-section">
      {/* Left Donut Card */}
      <div className="status-donut-card">
        <div className="section-card-header-row">
          <h2 className="section-card-title">Vehicle Status Overview</h2>
          <div className="card-filter-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>This Month</span>
            <span className="dropdown-caret">▾</span>
          </div>
        </div>

        <div className="donut-content-layout">
          <div className="status-donut-chart">
            <svg width="180" height="180" viewBox="0 0 42 42">
              {/* Background ring */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="var(--donut-track, #eef2f6)"
                strokeWidth="5"
              />

              {/* Available Slice (Blue) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="5"
                strokeDasharray={`${availNumPct} ${100 - availNumPct}`}
                strokeDashoffset={offsetAvail}
              />

              {/* On Trip Slice (Green) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="5"
                strokeDasharray={`${onTripNumPct} ${100 - onTripNumPct}`}
                strokeDashoffset={offsetOnTrip}
              />

              {/* Maintenance Slice (Orange) */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f97316"
                strokeWidth="5"
                strokeDasharray={`${maintNumPct} ${100 - maintNumPct}`}
                strokeDashoffset={offsetMaint}
              />
            </svg>

            <div className="status-donut-center">
              <strong className="donut-center-total">{totalDisplay}</strong>
              <span className="donut-center-label">Total Vehicles</span>
            </div>
          </div>

          <div className="status-legend-list">
            <div className="status-legend-item">
              <div className="status-legend-left">
                <span className="status-legend-dot dot-blue" />
                <span className="legend-name">Available</span>
              </div>
              <span className="legend-value">{available} ({availPct}%)</span>
            </div>

            <div className="status-legend-item">
              <div className="status-legend-left">
                <span className="status-legend-dot dot-green" />
                <span className="legend-name">On Trip</span>
              </div>
              <span className="legend-value">{onTrip} ({onTripPct}%)</span>
            </div>

            <div className="status-legend-item">
              <div className="status-legend-left">
                <span className="status-legend-dot dot-orange" />
                <span className="legend-name">Under Maintenance</span>
              </div>
              <span className="legend-value">{maint} ({maintPct}%)</span>
            </div>
          </div>
        </div>

        {/* Bottom Recommendation / Info Banner */}
        <div className="donut-recommendation-banner">
          <span className="recommendation-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span className="recommendation-text">
            Most of your fleet is available and ready for dispatch.
          </span>
        </div>
      </div>

      {/* Right 2x2 Metric Cards Grid */}
      <div className="metrics-2x2-grid">
        {/* Total Vehicles Card */}
        <div className="metric-box-card">
          <div className="metric-box-main">
            <div className="metric-box-header">
              <div className="metric-box-icon icon-purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="9" rx="2" />
                  <path d="M5 11l2-6h10l2 6" />
                  <circle cx="7.5" cy="15.5" r="1.5" />
                  <circle cx="16.5" cy="15.5" r="1.5" />
                </svg>
              </div>
              <div className="metric-box-info">
                <span className="metric-box-label">Total Vehicles</span>
                <div className="metric-box-num">{totalDisplay}</div>
                <div className="metric-trend trend-up">
                  <span className="trend-arrow">↑</span>
                  <span>8.2% this month</span>
                </div>
              </div>
            </div>
            {/* Mini Bar Chart */}
            <div className="mini-bar-chart bar-chart-purple">
              <span style={{ height: '35%' }} />
              <span style={{ height: '55%' }} />
              <span style={{ height: '45%' }} />
              <span style={{ height: '75%' }} />
              <span style={{ height: '60%' }} />
              <span style={{ height: '90%' }} />
            </div>
          </div>
        </div>

        {/* Active Trips Card */}
        <div className="metric-box-card">
          <div className="metric-box-main">
            <div className="metric-box-header">
              <div className="metric-box-icon icon-blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </div>
              <div className="metric-box-info">
                <span className="metric-box-label">Active Trips</span>
                <div className="metric-box-num">{activeTripsCount}</div>
                <div className="metric-trend trend-up">
                  <span className="trend-arrow">↑</span>
                  <span>5.4% this month</span>
                </div>
              </div>
            </div>
            {/* Mini Bar Chart */}
            <div className="mini-bar-chart bar-chart-blue">
              <span style={{ height: '40%' }} />
              <span style={{ height: '60%' }} />
              <span style={{ height: '50%' }} />
              <span style={{ height: '80%' }} />
              <span style={{ height: '70%' }} />
              <span style={{ height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="metric-box-card">
          <div className="metric-box-main">
            <div className="metric-box-header">
              <div className="metric-box-icon icon-orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className="metric-box-info">
                <span className="metric-box-label">Maintenance</span>
                <div className="metric-box-num">{maintenanceCount}</div>
                <div className="metric-trend trend-down">
                  <span className="trend-arrow">↓</span>
                  <span>-2.1% this month</span>
                </div>
              </div>
            </div>
            {/* Mini Bar Chart */}
            <div className="mini-bar-chart bar-chart-orange">
              <span style={{ height: '70%' }} />
              <span style={{ height: '55%' }} />
              <span style={{ height: '45%' }} />
              <span style={{ height: '60%' }} />
              <span style={{ height: '40%' }} />
              <span style={{ height: '30%' }} />
            </div>
          </div>
        </div>

        {/* Fleet Utilization Card */}
        <div className="metric-box-card">
          <div className="metric-box-main">
            <div className="metric-box-header">
              <div className="metric-box-icon icon-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div className="metric-box-info">
                <span className="metric-box-label">Fleet Utilization</span>
                <div className="metric-box-num">{utilization}%</div>
                <div className="metric-trend trend-up">
                  <span className="trend-arrow">↑</span>
                  <span>6.7% this month</span>
                </div>
              </div>
            </div>
            {/* Mini Bar Chart */}
            <div className="mini-bar-chart bar-chart-green">
              <span style={{ height: '35%' }} />
              <span style={{ height: '50%' }} />
              <span style={{ height: '65%' }} />
              <span style={{ height: '75%' }} />
              <span style={{ height: '85%' }} />
              <span style={{ height: '95%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
