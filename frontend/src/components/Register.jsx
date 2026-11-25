import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function RegisterHero() {
  return (
    <aside className="auth-hero-panel" aria-label="FleetFocus Overview">
      {/* Top Header Row */}
      <div className="auth-hero-top-row">
        {/* Brand Header */}
        <div className="auth-hero-brand">
          <div className="auth-brand-badge" aria-hidden="true">
            <span className="brand-diamond">◆</span>
          </div>
          <div className="auth-brand-text">
            <h2><span className="brand-title-fleet">Fleet</span><span className="brand-focus">Focus</span></h2>
            <p className="brand-tagline">Smarter Fleets. Greater Efficiency.</p>
          </div>
        </div>

        {/* Top Nav Tags */}
        <div className="auth-top-nav-menu" aria-label="Quick Links">
          <span>Drive</span>
          <span className="nav-menu-divider">|</span>
          <span>Track</span>
          <span className="nav-menu-divider">|</span>
          <span>Manage</span>
          <span className="nav-menu-divider">|</span>
          <span>Grow</span>
        </div>
      </div>

      {/* Hero Title & Subtext */}
      <div className="auth-hero-heading">
        <h1>
          <span className="hero-heading-top">Smarter</span>
          <span className="hero-heading-gradient gradient-text">Fleet Management</span>
          <span className="hero-heading-bottom">for a Better Tomorrow</span>
        </h1>
        <p className="auth-hero-desc">
          Track vehicles, manage operations, ensure safety and keep your business moving forward — all in one place.
        </p>
      </div>

      {/* 4 Feature Cards + 1 Frosted Accent Card */}
      <div className="auth-features-showcase-row">
        <div className="auth-feature-showcase-card">
          <div className="feature-icon-box icon-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="feature-showcase-text">
            <strong>Real-time Tracking</strong>
            <span>Know where your vehicles are.</span>
          </div>
        </div>

        <div className="auth-feature-showcase-card">
          <div className="feature-icon-box icon-emerald">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="feature-showcase-text">
            <strong>Enhanced Safety</strong>
            <span>Reduce risks, increase reliability.</span>
          </div>
        </div>

        <div className="auth-feature-showcase-card">
          <div className="feature-icon-box icon-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="feature-showcase-text">
            <strong>Better Efficiency</strong>
            <span>Optimize routes and performance.</span>
          </div>
        </div>

        <div className="auth-feature-showcase-card">
          <div className="feature-icon-box icon-amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="feature-showcase-text">
            <strong>Seamless Operations</strong>
            <span>Manage your fleet with ease.</span>
          </div>
        </div>

        {/* 5th Card: Smarter Routes Safer Journeys */}
        <div className="auth-feature-showcase-card frosted-routes-card">
          <div className="routes-accent-bar"></div>
          <div className="routes-card-content">
            <span className="routes-label">Smarter Routes</span>
            <strong className="routes-title">Safer Journeys</strong>
          </div>
        </div>
      </div>

      {/* Scenic Road, Skyline, and Waypoint Route */}
      <div className="auth-hero-scenery-container" aria-hidden="true">
        <svg viewBox="0 0 900 360" fill="none" preserveAspectRatio="xMidYMid slice" className="auth-scenery-svg">
          <defs>
            <linearGradient id="skyGradReg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="cityGradFarReg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="cityGradNearReg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="highwayGradReg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="curveLineGlowReg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#00b4d8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Distant City Skyline */}
          <g opacity="0.65" transform="translate(180, 70)">
            <rect x="0" y="50" width="30" height="120" fill="url(#cityGradFarReg)" />
            <rect x="35" y="30" width="40" height="140" fill="url(#cityGradFarReg)" />
            <polygon points="55,5 40,30 70,30" fill="url(#cityGradFarReg)" />
            <rect x="80" y="60" width="35" height="110" fill="url(#cityGradFarReg)" />
            <rect x="120" y="20" width="45" height="150" fill="url(#cityGradFarReg)" />
            <polygon points="142,0 125,20 160,20" fill="url(#cityGradFarReg)" />
            <rect x="170" y="70" width="30" height="100" fill="url(#cityGradFarReg)" />
            <rect x="205" y="40" width="40" height="130" fill="url(#cityGradFarReg)" />
            <rect x="250" y="80" width="30" height="90" fill="url(#cityGradFarReg)" />
            <rect x="285" y="55" width="35" height="115" fill="url(#cityGradFarReg)" />
          </g>

          {/* Midground Trees & Foliage */}
          <g opacity="0.75" transform="translate(60, 180)">
            <ellipse cx="60" cy="30" rx="35" ry="25" fill="#a7f3d0" />
            <ellipse cx="80" cy="20" rx="30" ry="22" fill="#6ee7b7" />
            <ellipse cx="140" cy="25" rx="40" ry="25" fill="#a7f3d0" />
            <ellipse cx="380" cy="28" rx="45" ry="28" fill="#6ee7b7" />
            <ellipse cx="440" cy="22" rx="35" ry="25" fill="#a7f3d0" />
            <ellipse cx="500" cy="30" rx="50" ry="30" fill="#6ee7b7" />
          </g>

          {/* Curved Modern Highway */}
          <path
            d="M -50 360 Q 250 250 540 210 Q 720 185 920 180 L 920 360 L -50 360 Z"
            fill="url(#highwayGradReg)"
          />
          {/* Road White / Yellow Center Dashes */}
          <path
            d="M -50 350 Q 250 270 540 220 Q 720 192 920 184"
            stroke="#f8fafc"
            strokeWidth="3.5"
            strokeDasharray="16 14"
            fill="none"
            opacity="0.8"
          />

          {/* Semi-Truck driving on highway */}
          <g transform="translate(240, 195) scale(0.65)">
            <rect x="0" y="10" width="120" height="65" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="120" y="25" width="45" height="50" rx="4" fill="#0284c7" />
            <path d="M 140 25 L 155 40 L 165 40 L 165 75 L 120 75 Z" fill="#0369a1" />
            <rect x="135" y="32" width="22" height="16" rx="2" fill="#e0f2fe" />
            <circle cx="30" cy="78" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="85" cy="78" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="145" cy="78" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
          </g>

          {/* Glowing Dotted Waypoint Route */}
          <path
            d="M 120 160 Q 320 80 500 130 T 780 120"
            fill="none"
            stroke="url(#curveLineGlowReg)"
            strokeWidth="3.5"
            strokeDasharray="6 6"
          />

          {/* Location Pin 1: Planned */}
          <g transform="translate(120, 160)">
            <circle cx="0" cy="0" r="14" fill="#0284c7" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="6" fill="#0284c7" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            <g transform="translate(16, -18)">
              <rect x="0" y="0" width="86" height="30" rx="15" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
              <circle cx="15" cy="15" r="4" fill="#0284c7" />
              <text x="26" y="19" fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">Planned</text>
            </g>
          </g>

          {/* Location Pin 2: In Transit */}
          <g transform="translate(480, 125)">
            <circle cx="0" cy="0" r="14" fill="#0284c7" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="6" fill="#0284c7" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            <g transform="translate(16, -18)">
              <rect x="0" y="0" width="94" height="30" rx="15" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
              <circle cx="15" cy="15" r="4" fill="#0284c7" />
              <text x="26" y="19" fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">In Transit</text>
            </g>
          </g>

          {/* Location Pin 3: Delivered */}
          <g transform="translate(760, 120)">
            <circle cx="0" cy="0" r="14" fill="#10b981" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="6" fill="#10b981" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            <g transform="translate(16, -18)">
              <rect x="0" y="0" width="96" height="30" rx="15" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.5" />
              <text x="12" y="20" fill="#10b981" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">✓</text>
              <text x="28" y="19" fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">Delivered</text>
            </g>
          </g>
        </svg>
      </div>

      {/* Bottom Footer Accent */}
      <div className="auth-hero-bottom-footer" aria-hidden="true">
        <div className="footer-accent-line"></div>
        <span className="footer-brand-tagline">DRIVE &nbsp;|&nbsp; TRACK &nbsp;|&nbsp; MANAGE &nbsp;|&nbsp; GROW</span>
      </div>
    </aside>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'DRIVER',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedEmail = (formData.email || '').trim();

    if (!trimmedUsername) {
      setError('Please enter a username.');
      return;
    }

    if (!trimmedPassword) {
      setError('Please enter a password.');
      return;
    }

    let selectedRole = formData.role || 'DRIVER';
    if (selectedRole === 'TECHNICIAN') {
      selectedRole = 'MAINTENANCE_TECH';
    }

    const payload = {
      username: trimmedUsername,
      password: trimmedPassword,
      email: trimmedEmail || `${trimmedUsername}@fleet.com`,
      role: selectedRole,
    };

    try {
      setLoading(true);

      const response = await authService.register(payload);

      setMessage(
        typeof response === 'string'
          ? response
          : 'Registration successful.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        'Registration failed. Please try again.';

      setError(
        typeof backendMessage === 'string'
          ? backendMessage
          : 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="auth-layout-container">
        {/* Left: Showcase Hero Panel */}
        <RegisterHero />

        {/* Right: Auth Form Panel */}
        <div className="auth-form-panel">
          <div className="login-container">
            <section className="login-card register-card">
              {/* Card Brand Header */}
              <div className="login-card-brand">
                <div className="login-brand-icon" aria-hidden="true">
                  ◆
                </div>
                <div className="login-brand-info">
                  <h2>Fleet<span className="brand-focus">Focus</span></h2>
                  <p>Fleet Management &amp; Operations Platform</p>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="login-card-heading">
                <h3>Create Account</h3>
                <p className="login-card-subtitle">
                  Join FleetFocus to streamline your fleet operations.
                </p>
              </div>

              {/* SUCCESS */}
              {message && (
                <div
                  className="alert alert-success login-error"
                  role="alert"
                >
                  <span className="alert-icon">✓</span>
                  <span>{message}</span>
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div
                  className="alert alert-error login-error"
                  role="alert"
                >
                  <span className="alert-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              <form
                className="login-form"
                onSubmit={handleSubmit}
              >
                {/* USERNAME */}
                <div className="form-group">
                  <label htmlFor="register-username">
                    Username
                  </label>
                  <div className="input-with-icon">
                    <span
                      className="input-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </span>
                    <input
                      id="register-username"
                      name="username"
                      type="text"
                      placeholder="Enter username"
                      value={formData.username}
                      onChange={handleChange}
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="form-group">
                  <label htmlFor="register-email">
                    Email
                  </label>
                  <div className="input-with-icon">
                    <span
                      className="input-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    </span>
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="e.g. user@fleet.com (optional)"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="form-group">
                  <label htmlFor="register-password">
                    Password
                  </label>
                  <div className="input-with-icon">
                    <span
                      className="input-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    </span>
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="23" x2="23" y2="1" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator Bars & Hint */}
                  <div className="password-strength-indicator">
                    <div className="strength-bars">
                      <span className={`strength-bar ${formData.password.length > 0 ? 'active' : ''}`}></span>
                      <span className={`strength-bar ${formData.password.length >= 4 ? 'active' : ''}`}></span>
                      <span className={`strength-bar ${formData.password.length >= 8 ? 'active' : ''}`}></span>
                      <span className={`strength-bar ${formData.password.length >= 10 ? 'active' : ''}`}></span>
                    </div>
                    <span className="strength-hint">Use at least 8 characters</span>
                  </div>
                </div>

                {/* ROLE */}
                <div className="form-group">
                  <label htmlFor="register-role">
                    Role
                  </label>
                  <div className="input-with-icon role-select-wrapper">
                    <span
                      className="input-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </span>
                    <select
                      id="register-role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="DRIVER">Driver</option>
                      <option value="FLEET_MANAGER">Fleet Manager</option>
                      <option value="MAINTENANCE_TECH">Technician</option>
                      <option value="DISPATCHER">Dispatcher</option>
                    </select>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="btn btn-primary login-submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="loading-spinner-small"
                        aria-hidden="true"
                      />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <span
                        className="login-arrow"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* LOGIN LINK */}
              <div className="login-register">
                <span>Already have an account?</span>
                <Link
                  to="/login"
                  className="register-link"
                >
                  Login
                </Link>
              </div>
            </section>

            {/* Bottom Metrics Bar */}
            <div className="auth-right-metrics-bar" aria-label="System Metrics">
              <div className="auth-metric-item">
                <span className="metric-icon">🚚</span>
                <span className="metric-val">250+</span>
                <span className="metric-lbl">Vehicles Tracked</span>
              </div>
              <div className="auth-metric-item">
                <span className="metric-icon">📈</span>
                <span className="metric-val">99.9%</span>
                <span className="metric-lbl">Uptime</span>
              </div>
              <div className="auth-metric-item">
                <span className="metric-icon">🛡️</span>
                <span className="metric-val">Safer</span>
                <span className="metric-lbl">Operations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}