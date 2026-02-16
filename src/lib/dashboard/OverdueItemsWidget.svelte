<script lang="ts">
  import { app } from '$lib/stores/app.js';
  import type { OverdueCheckoutItem } from '../../application/use-cases/dashboard-use-cases.js';

  let items = $state<OverdueCheckoutItem[]>([]);
  let loading = $state(true);

  $effect(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    items = await app.getOverdueCheckouts();
    loading = false;
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-900">Overdue Items</h2>
    {#if !loading && items.length > 0}
      <span class="px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
        {items.length}
      </span>
    {/if}
  </div>

  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else if items.length === 0}
    <p class="text-green-600">No overdue items</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="pb-2 font-medium">Member</th>
            <th class="pb-2 font-medium">Item</th>
            <th class="pb-2 font-medium">Due</th>
            <th class="pb-2 font-medium text-right">Days Overdue</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {#each items as item}
            <tr>
              <td class="py-3">
                <div class="font-medium text-gray-900">{item.memberName}</div>
                <div class="text-gray-500 text-xs">{item.collegeId}</div>
                <div class="text-gray-500 text-xs">
                  {item.memberEmail}
                  {#if item.memberPhone}
                    &middot; {item.memberPhone}
                  {/if}
                </div>
              </td>
              <td class="py-3 text-gray-900">{item.itemDescription}</td>
              <td class="py-3 text-gray-500">{formatDate(item.dueAt)}</td>
              <td class="py-3 text-right">
                <span
                  class="inline-block px-2 py-0.5 rounded text-xs font-medium {item.daysOverdue >= 7
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'}"
                >
                  {item.daysOverdue}d
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
