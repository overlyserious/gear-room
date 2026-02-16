const STORAGE_KEY = 'gear-room:dashboard-widgets';

export type WidgetId = 'overdue-items' | 'inventory-status';

export interface DashboardPreferences {
  hiddenWidgets: WidgetId[];
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  hiddenWidgets: []
};

export function loadPreferences(): DashboardPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored);
    if (parsed && Array.isArray(parsed.hiddenWidgets)) {
      return { hiddenWidgets: parsed.hiddenWidgets };
    }
    return DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: DashboardPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isWidgetVisible(prefs: DashboardPreferences, id: WidgetId): boolean {
  return !prefs.hiddenWidgets.includes(id);
}

export function toggleWidget(prefs: DashboardPreferences, id: WidgetId): DashboardPreferences {
  const hidden = prefs.hiddenWidgets.includes(id)
    ? prefs.hiddenWidgets.filter(w => w !== id)
    : [...prefs.hiddenWidgets, id];
  return { hiddenWidgets: hidden };
}
