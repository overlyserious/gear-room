import type { WidgetId } from '$lib/stores/dashboard-preferences.js';

export interface WidgetDefinition {
  id: WidgetId;
  label: string;
  description: string;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'overdue-items',
    label: 'Overdue Items',
    description: 'Items past their due date with member contact info'
  },
  {
    id: 'inventory-status',
    label: 'Inventory Status',
    description: 'Counts by category and status'
  }
];
