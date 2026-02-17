<script lang="ts">
  import type { GearTypeListItem } from '../../application/use-cases/inventory-use-cases.js';
  import TrackingModeBadge from './TrackingModeBadge.svelte';

  let { item, onclick }: { item: GearTypeListItem; onclick: () => void } = $props();

  const gt = $derived(item.gearType);
  const counts = $derived(item.statusCounts);
</script>

<button
  {onclick}
  class="w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
>
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-gray-900">{gt.name}</span>
      <TrackingModeBadge mode={gt.trackingMode} />
    </div>
    <span class="text-sm text-gray-500">
      {#if gt.isBulkTracked}
        Qty: {gt.totalQuantity}
      {:else}
        {counts.total} item{counts.total !== 1 ? 's' : ''}
      {/if}
    </span>
  </div>

  {#if gt.isIndividuallyTracked}
    <div class="flex gap-3 text-xs text-gray-500">
      {#if counts.available > 0}
        <span>Available: {counts.available}</span>
      {/if}
      {#if counts.checkedOut > 0}
        <span>Checked Out: {counts.checkedOut}</span>
      {/if}
      {#if counts.maintenance > 0}
        <span>Maintenance: {counts.maintenance}</span>
      {/if}
      {#if counts.retired > 0}
        <span>Retired: {counts.retired}</span>
      {/if}
    </div>
  {/if}
</button>
