// Custom entry point: keep expo-router's bootstrap, then register the
// Android home-screen widget background task. Guarded so it never runs on iOS.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
