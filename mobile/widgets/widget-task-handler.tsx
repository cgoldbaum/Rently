import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { UpcomingPaymentsWidget } from './UpcomingPaymentsWidget';
import { loadWidgetData } from './cache';

const nameToWidget = {
  // Must match the `name` declared in the app.json plugin config.
  UpcomingPayments: UpcomingPaymentsWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const widgetName = props.widgetInfo.widgetName as keyof typeof nameToWidget;
  const Widget = nameToWidget[widgetName];
  if (!Widget) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await loadWidgetData();
      props.renderWidget(<Widget data={data} />);
      break;
    }
    // Tap opening the app is handled natively via clickAction="OPEN_APP".
    case 'WIDGET_CLICK':
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
