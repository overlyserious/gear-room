<script lang="ts">
  import { app } from '$lib/stores/app.js';
  import type { InventoryStatusSummary } from '../../application/use-cases/dashboard-use-cases.js';

  let status = $state<InventoryStatusSummary | null>(null);
  let loading = $state(true);

  $effect(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    status = await app.getInventoryStatus();
    loading = false;
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h2>

  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else if status && status.categories.length === 0}
    <p class="text-gray-500">No inventory data</p>
  {:else if status}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="pb-2 font-medium">Category</th>
            <th class="pb-2 font-medium text-right">Available</th>
            <th class="pb-2 font-medium text-right">Checked Out</th>
            <th class="pb-2 font-medium text-right">Maintenance</th>
            <th class="pb-2 font-medium text-right">Retired</th>
            <th class="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {#each status.categories as cat}
            <tr>
              <td class="py-2 font-medium text-gray-900">{cat.categoryLabel}</td>
              <td class="py-2 text-right text-gray-700">{cat.available}</td>
              <td class="py-2 text-right text-gray-700">{cat.checkedOut}</td>
              <td class="py-2 text-right text-gray-700">{cat.maintenance}</td>
              <td class="py-2 text-right text-gray-400">{cat.retired}</td>
              <td class="py-2 text-right font-medium text-gray-900">{cat.total}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="border-t-2">
            <td class="pt-2 font-semibold text-gray-900">Totals</td>
            <td class="pt-2 text-right font-semibold text-gray-900">{status.totals.available}</td>
            <td class="pt-2 text-right font-semibold text-gray-900">{status.totals.checkedOut}</td>
            <td class="pt-2 text-right font-semibold text-gray-900">{status.totals.maintenance}</td>
            <td class="pt-2 text-right font-semibold text-gray-400">{status.totals.retired}</td>
            <td class="pt-2 text-right font-semibold text-gray-900">{status.totals.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}
</div>
