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
            class="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
          >
            Edit
          </button>
        {/if}
        {#if onMaintenance}
          <button
            onclick={() => onMaintenance?.(item)}
            class="px-2 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
          >
            Maintenance
          </button>
        {/if}
        {#if onRetire}
          <button
            onclick={() => onRetire?.(item)}
            class="px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
          >
            Retire
          </button>
        {/if}
      {:else if isMaintenance}
        {#if onEdit}
          <button
            onclick={() => onEdit?.(item)}
            class="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
          >
            Edit
          </button>
        {/if}
        {#if onReturnFromMaintenance}
          <button
            onclick={() => onReturnFromMaintenance?.(item)}
            class="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
          >
            Return from Maint.
          </button>
        {/if}
        {#if onRetire}
          <button
            onclick={() => onRetire?.(item)}
            class="px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
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
