import AsyncStorage from '@react-native-async-storage/async-storage';

// Shape stored for the home-screen widget. The app writes it; the widget
// task handler reads it. Kept intentionally small and pre-formatted so the
// widget renderer does no data fetching of its own.
export type WidgetItem = {
  label: string; // e.g. "Junio 2026"
  amount: string; // e.g. "$ 120.000"
  dueDate: string; // ISO date — day diff is recomputed at render time
  paid: boolean;
};

export type WidgetData = {
  updatedAt: number;
  loggedIn: boolean;
  items: WidgetItem[];
};

const KEY = 'widget_upcoming_v1';

export const EMPTY_WIDGET_DATA: WidgetData = {
  updatedAt: 0,
  loggedIn: false,
  items: [],
};

export async function saveWidgetData(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Best-effort: a failed cache write just means the widget keeps old data.
  }
}

export async function loadWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as WidgetData;
  } catch {
    // Corrupt or missing data — fall back to empty.
  }
  return EMPTY_WIDGET_DATA;
}
