import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const NotificationContext = createContext(() => {});

export function useNotifications() {
  return useContext(NotificationContext);
}

const ICONS = {
  success: '✓',
  warning: '!',
  error: '×',
};

const TITLES = {
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();

    setNotifications((previous) => [
      ...previous,
      {
        id,
        message,
        type,
      },
    ]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((previous) =>
      previous.filter((notification) => notification.id !== id)
    );
  }, []);

  useEffect(() => {
    const timers = notifications.map((notification) =>
      setTimeout(() => {
        dismiss(notification.id);
      }, 5000)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [notifications, dismiss]);

  return (
    <NotificationContext.Provider value={addNotification}>
      {children}

      <div
        className="notification-stack ff-toast-stack"
        aria-live="polite"
        aria-atomic="false"
      >
        {notifications.slice(-5).map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type} ff-toast ff-toast-${notification.type}`}
            role="alert"
          >
            <div className="notification-icon ff-toast-icon">
              {ICONS[notification.type] || '!'}
            </div>

            <div className="notification-content ff-toast-content">
              <strong className="notification-title ff-toast-title">
                {TITLES[notification.type] || 'Notification'}
              </strong>

              <span className="notification-message ff-toast-message">
                {notification.message}
              </span>
            </div>

            <button
              type="button"
              className="notification-close ff-toast-close"
              onClick={() => dismiss(notification.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
