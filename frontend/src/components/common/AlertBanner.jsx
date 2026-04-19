import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info, OctagonAlert, X } from 'lucide-react';
import { alertsAPI } from '../../services/api';

const DISMISS_STORAGE_KEY = 'dismissedAlerts';

const LEVEL_STYLES = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: Info,
    iconClass: 'text-blue-600',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  critical: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon: OctagonAlert,
    iconClass: 'text-red-600',
  },
};

function readDismissed() {
  try {
    const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(set) {
  try {
    sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* storage quota exceeded — dismissal is best-effort */
  }
}

const AlertBanner = () => {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await alertsAPI.getActive();
        if (!cancelled && Array.isArray(res?.data)) {
          setAlerts(res.data);
        }
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const visible = useMemo(
    () => alerts.filter((alert) => !dismissed.has(alert.id)),
    [alerts, dismissed]
  );

  if (!visible.length) return null;

  const handleDismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    persistDismissed(next);
  };

  return (
    <div className="space-y-2 mb-4">
      {visible.map((alert) => {
        const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={alert.id}
            role="alert"
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.container}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconClass}`} />
            <div className="flex-1">
              <p className="font-semibold">{alert.titre}</p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              aria-label="Dismiss alert"
              className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AlertBanner;
