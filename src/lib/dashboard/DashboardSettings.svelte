<script lang="ts">
  import { WIDGET_REGISTRY } from './widget-registry.js';
  import { isWidgetVisible } from '$lib/stores/dashboard-preferences.js';
  import type { DashboardPreferences, WidgetId } from '$lib/stores/dashboard-preferences.js';

  let { preferences, onToggle }: {
    preferences: DashboardPreferences;
    onToggle: (id: WidgetId) => void;
  } = $props();
</script>

<div class="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
  <h3 class="text-sm font-medium text-gray-700 mb-3">Show/Hide Widgets</h3>
  <div class="flex flex-wrap gap-4">
    {#each WIDGET_REGISTRY as widget}
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isWidgetVisible(preferences, widget.id)}
          onchange={() => onToggle(widget.id)}
          class="w-4 h-4 rounded border-gray-300"
        />
        <span class="text-gray-700">{widget.label}</span>
        <span class="text-gray-400 hidden sm:inline">— {widget.description}</span>
      </label>
    {/each}
  </div>
</div>
