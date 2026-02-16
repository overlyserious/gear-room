<script lang="ts">
  import {
    loadPreferences,
    savePreferences,
    isWidgetVisible,
    toggleWidget
  } from '$lib/stores/dashboard-preferences.js';
  import type { WidgetId } from '$lib/stores/dashboard-preferences.js';
  import OverdueItemsWidget from '$lib/dashboard/OverdueItemsWidget.svelte';
  import InventoryStatusWidget from '$lib/dashboard/InventoryStatusWidget.svelte';
  import DashboardSettings from '$lib/dashboard/DashboardSettings.svelte';

  let preferences = $state(loadPreferences());
  let showSettings = $state(false);

  function handleToggle(id: WidgetId) {
    preferences = toggleWidget(preferences, id);
    savePreferences(preferences);
  }
</script>

<div class="max-w-6xl mx-auto p-6">
  <header class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <a href="/" class="text-blue-600 hover:underline text-sm">Back to Home</a>
    </div>
    <button
      onclick={() => (showSettings = !showSettings)}
      class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
    >
      {showSettings ? 'Hide Settings' : 'Settings'}
    </button>
  </header>

  {#if showSettings}
    <DashboardSettings {preferences} onToggle={handleToggle} />
  {/if}

  <div class="space-y-6">
    {#if isWidgetVisible(preferences, 'overdue-items')}
      <OverdueItemsWidget />
    {/if}

    {#if isWidgetVisible(preferences, 'inventory-status')}
      <InventoryStatusWidget />
    {/if}
  </div>
</div>
