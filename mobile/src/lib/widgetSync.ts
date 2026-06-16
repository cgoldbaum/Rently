import { Platform } from 'react-native';
import { saveWidgetData, type WidgetItem } from '../../widgets/cache';

// Persists the latest upcoming-payment data and pushes it to any widget that
// is already on the home screen. Android-only; a no-op elsewhere. Safe to call
// even if the native module is unavailable (e.g. Expo Go) — the cache write
// still succeeds and errors are swallowed.
export async function syncUpcomingWidget(
  items: WidgetItem[],
  loggedIn = true
): Promise<void> {
  if (Platform.OS !== 'android') return;

  const data = { updatedAt: Date.now(), loggedIn, items };
  await saveWidgetData(data);

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const React = require('react');
    const { UpcomingPaymentsWidget } = require('../../widgets/UpcomingPaymentsWidget');
    await requestWidgetUpdate({
      widgetName: 'UpcomingPayments',
      renderWidget: () => React.createElement(UpcomingPaymentsWidget, { data }),
      widgetNotFound: () => {},
    });
  } catch {
    // No native module or no widget added yet — cached data is enough.
  }
}
