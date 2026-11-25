import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'fleetfocus_preferences_v1';

export const DEFAULT_PREFERENCES = {
  theme: 'dark',
  currency: 'INR',
  compactTables: false,
  sidebarCollapsed: false,
  pollingIntervalMs: 5000,
  overspeedThreshold: 90,
  lowFuelThreshold: 25,
  serviceMileageThreshold: 40000,
  notificationsEnabled: true,
};

function loadInitialPreferences() {
  try {
    const legacyTheme = localStorage.getItem('fleet_theme');
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_PREFERENCES,
      ...(legacyTheme === 'light' || legacyTheme === 'dark' ? { theme: legacyTheme } : {}),
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function formatCurrencyValue(amount, currency = 'INR') {
  const numeric = Number(amount);
  if (amount === null || amount === undefined || Number.isNaN(numeric)) {
    return 'Not Available';
  }
  const code = currency === 'USD' ? 'USD' : 'INR';
  const locale = code === 'USD' ? 'en-US' : 'en-IN';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    const symbol = code === 'USD' ? '$' : '₹';
    return `${symbol}${numeric.toFixed(2)}`;
  }
}

const fallbackContext = {
  preferences: DEFAULT_PREFERENCES,
  updatePreferences: () => {},
  resetPreferences: () => {},
  toggleTheme: () => {},
  toggleSidebarCollapsed: () => {},
  formatCurrency: (amount) => formatCurrencyValue(amount, DEFAULT_PREFERENCES.currency),
};

const PreferencesContext = createContext(fallbackContext);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadInitialPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      localStorage.setItem('fleet_theme', preferences.theme);
    } catch {
      // Ignore storage quota / private mode errors
    }

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', preferences.theme);
      document.body.classList.add('ff-body');
      if (preferences.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }, [preferences]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...DEFAULT_PREFERENCES });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const formatCurrency = useCallback(
    (amount) => formatCurrencyValue(amount, preferences.currency),
    [preferences.currency]
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
      resetPreferences,
      toggleTheme,
      toggleSidebarCollapsed,
      formatCurrency,
    }),
    [preferences, updatePreferences, resetPreferences, toggleTheme, toggleSidebarCollapsed, formatCurrency]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
