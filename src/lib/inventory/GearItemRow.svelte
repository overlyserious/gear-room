<script lang="ts">
  import type { GearItem } from '../../domain/entities/gear-item.js';
  import { GearStatus } from '../../domain/types.js';
  import StatusBadge from './StatusBadge.svelte';
  import ConditionBadge from './ConditionBadge.svelte';

  let {
    item,
    onEdit,
    onMaintenance,
    onReturnFromMaintenance,
    onRetire
  }: {
    item: GearItem;
    onEdit?: (item: GearItem) => void;
    onMaintenance?: (item: GearItem) => void;
    onReturnFromMaintenance?: (item: GearItem) => void;
    onRetire?: (item: GearItem) => void;
  } = $props();

  const isAvailable = $derived(item.status === GearStatus.AVAILABLE);
  const isCheckedOut = $derived(item.status === GearStatus.CHECKED_OUT);
  const isMaintenance = $derived(item.status === GearStatus.MAINTENANCE);
  const isRetired = $derived(item.status === GearStatus.RETIRED);
</script>

<tr class={isRetired ? 'opacity-50' : ''}>
  <td class="py-3 font-mono text-sm">{item.code}</td>
  <td class="py-3"><ConditionBadge condition={item.condition} /></td>
  <td class="py-3"><StatusBadge status={item.status} /></td>
  <td class="py-3 text-sm text-gray-500">{item.notes ?? ''}</td>
  <td class="py-3 text-right">
    <div class="flex justify-end gap-1">
      {#if isAvailable}
        {#if onEdit}
          <button
            onclick={() => onEdit?.(item)}
            class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Edit
          </button>
        {/if}
        {#if onMaintenance}
          <button
            onclick={() => onMaintenance?.(item)}
            class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Maintenance
          </button>
        {/if}
        {#if onRetire}
          <button
            onclick={() => onRetire?.(item)}
            class="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
          >
            Retire
          </button>
        {/if}
      {:else if isMaintenance}
        {#if onEdit}
          <button
            onclick={() => onEdit?.(item)}
            class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Edit
          </button>
        {/if}
        {#if onReturnFromMaintenance}
          <button
            onclick={() => onReturnFromMaintenance?.(item)}
            class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Return from Maint.
          </button>
        {/if}
        {#if onRetire}
          <button
            onclick={() => onRetire?.(item)}
            class="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
          >
            Retire
          </button>
        {/if}
      {:else if isCheckedOut}
        <span class="text-xs text-gray-400 italic">Checked out</span>
      {/if}
    </div>
  </td>
</tr>
