<script lang="ts">
  import type { OpenItemSummary } from '../../application/use-cases/member-history-use-cases.js';
  import ConditionBadge from '../inventory/ConditionBadge.svelte';

  let { openItems }: { openItems: OpenItemSummary[] } = $props();

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCategory(cat: string): string {
    return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
</script>

<section class="bg-white rounded-lg shadow p-6">
  <h2 class="text-lg font-semibold mb-4">Open Items</h2>

  {#if openItems.length === 0}
    <p class="text-gray-500 text-sm">No open checkouts.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-600">
            <th class="pb-2 pr-4 font-medium">Item</th>
            <th class="pb-2 pr-4 font-medium">Category</th>
            <th class="pb-2 pr-4 font-medium">Checked Out</th>
            <th class="pb-2 pr-4 font-medium">Due</th>
            <th class="pb-2 pr-4 font-medium">Overdue</th>
            <th class="pb-2 font-medium">Condition</th>
          </tr>
        </thead>
        <tbody>
          {#each openItems as item}
            <tr class="border-b last:border-0 {item.isOverdue ? 'bg-red-50' : ''}">
              <td class="py-3 pr-4">
                <div class="font-medium">{item.gearTypeName}</div>
                {#if item.gearItemCode}
                  <div class="text-xs text-gray-500">{item.gearItemCode}</div>
                {:else if item.quantity > 1}
                  <div class="text-xs text-gray-500">
                    x{item.quantity - item.returnedQuantity} remaining
                  </div>
                {/if}
              </td>
              <td class="py-3 pr-4 text-gray-600">{formatCategory(item.gearCategory)}</td>
              <td class="py-3 pr-4">{formatDate(item.checkedOutAt)}</td>
              <td class="py-3 pr-4">{formatDate(item.dueAt)}</td>
              <td class="py-3 pr-4">
                {#if item.isOverdue}
                  <span class="text-red-700 font-semibold">{item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'}</span>
                {:else}
                  <span class="text-gray-400">&mdash;</span>
                {/if}
              </td>
              <td class="py-3">
                {#if item.conditionAtCheckout}
                  <ConditionBadge condition={item.conditionAtCheckout} />
                {:else}
                  <span class="text-gray-400">&mdash;</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
