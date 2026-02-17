<script lang="ts">
  import type { GearTypeDetail } from '../../application/use-cases/inventory-use-cases.js';
  import type { GearItem } from '../../domain/entities/gear-item.js';
  import TrackingModeBadge from './TrackingModeBadge.svelte';
  import GearItemRow from './GearItemRow.svelte';

  let {
    detail,
    onBack,
    onEdit,
    onDelete,
    onAddItem,
    onUpdateBulkQuantity,
    onItemEdit,
    onItemMaintenance,
    onItemReturnFromMaintenance,
    onItemRetire
  }: {
    detail: GearTypeDetail;
    onBack: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onAddItem?: () => void;
    onUpdateBulkQuantity?: (newQuantity: number) => void;
    onItemEdit?: (item: GearItem) => void;
    onItemMaintenance?: (item: GearItem) => void;
    onItemReturnFromMaintenance?: (item: GearItem) => void;
    onItemRetire?: (item: GearItem) => void;
  } = $props();

  const gt = $derived(detail.gearType);
  const counts = $derived(detail.statusCounts);

  function formatCategory(cat: string): string {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
</script>

<div>
  <button onclick={onBack} class="text-blue-600 hover:underline text-sm mb-4 inline-block">
    ← Back to list
  </button>

  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <div class="flex items-start justify-between mb-2">
      <h2 class="text-xl font-bold text-gray-900">{gt.name}</h2>
      <div class="flex gap-2">
        {#if onEdit}
          <button
            onclick={onEdit}
            class="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            Edit
          </button>
        {/if}
        {#if onDelete}
          <button
            onclick={onDelete}
            class="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-3 text-sm text-gray-600 mb-3">
      <span>Category: {formatCategory(gt.category)}</span>
      <span>·</span>
      <TrackingModeBadge mode={gt.trackingMode} />
      <span>·</span>
      <span>Checkout: {gt.checkoutDurationDays} day{gt.checkoutDurationDays !== 1 ? 's' : ''}</span>
    </div>

    {#if gt.notes}
      <p class="text-sm text-gray-500">{gt.notes}</p>
    {/if}
  </div>

  {#if gt.isBulkTracked}
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-4">Quantity</h3>
      <div class="flex items-center gap-4">
        <button
          onclick={() => onUpdateBulkQuantity?.(gt.totalQuantity - 1)}
          disabled={gt.totalQuantity <= 0 || !onUpdateBulkQuantity}
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
        >
          −
        </button>
        <div class="text-3xl font-bold text-gray-900">{gt.totalQuantity}</div>
        <button
          onclick={() => onUpdateBulkQuantity?.(gt.totalQuantity + 1)}
          disabled={!onUpdateBulkQuantity}
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-lg font-bold"
        >
          +
        </button>
      </div>
      <div class="text-sm text-gray-500 mt-1">total units in inventory</div>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">
          Items ({counts.total} total)
        </h3>
        {#if onAddItem}
          <button
            onclick={onAddItem}
            class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Item
          </button>
        {/if}
      </div>

      <div class="flex gap-4 text-sm mb-4">
        <span class="text-green-700">Available: {counts.available}</span>
        <span class="text-blue-700">Checked Out: {counts.checkedOut}</span>
        <span class="text-amber-700">Maintenance: {counts.maintenance}</span>
        <span class="text-gray-400">Retired: {counts.retired}</span>
      </div>

      {#if detail.items.length === 0}
        <div class="text-center py-6 text-gray-500">
          No items registered yet. Add your first item to get started.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="pb-2 font-medium">Code</th>
                <th class="pb-2 font-medium">Condition</th>
                <th class="pb-2 font-medium">Status</th>
                <th class="pb-2 font-medium">Notes</th>
                <th class="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each detail.items as item}
                <GearItemRow
                  {item}
                  onEdit={onItemEdit}
                  onMaintenance={onItemMaintenance}
                  onReturnFromMaintenance={onItemReturnFromMaintenance}
                  onRetire={onItemRetire}
                />
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>
