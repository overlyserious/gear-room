<script lang="ts">
  import {
    loadPreferences,
    savePreferences,
    isWidgetVisible,
    toggleWidget
  } from '$lib/stores/dashboard-preferences.js';
  import type { WidgetId } from '$lib/stores/dashboard-preferences.js';
  import { WIDGET_REGISTRY } from '$lib/dashboard/widget-registry.js';
  import OverdueItemsWidget from '$lib/dashboard/OverdueItemsWidget.svelte';
  import InventoryStatusWidget from '$lib/dashboard/InventoryStatusWidget.svelte';

  let preferences = $state(loadPreferences());

  function handleToggle(id: WidgetId) {
    preferences = toggleWidget(preferences, id);
    savePreferences(preferences);
  }
</script>

<div class="max-w-5xl mx-auto p-6">
  <header class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
    <div class="flex items-center gap-3">
      {#each WIDGET_REGISTRY as widget}
        <label class="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isWidgetVisible(preferences, widget.id)}
            onchange={() => handleToggle(widget.id)}
            class="w-3.5 h-3.5 rounded border-gray-300"
          />
          <span class="text-gray-600">{widget.label}</span>
        </label>
      {/each}
    </div>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {#if isWidgetVisible(preferences, 'overdue-items')}
      <OverdueItemsWidget />
    {/if}

    {#if isWidgetVisible(preferences, 'inventory-status')}
      <InventoryStatusWidget />
    {/if}
  </div>
</div>
