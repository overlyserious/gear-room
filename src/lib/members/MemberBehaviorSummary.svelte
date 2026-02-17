<script lang="ts">
  import type { BehaviorSummary } from '../../application/use-cases/member-history-use-cases.js';

  let { summary }: { summary: BehaviorSummary } = $props();

  function formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<section class="bg-white rounded-lg shadow p-6">
  <h2 class="text-lg font-semibold mb-4">Behavior Summary</h2>

  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-2xl font-bold text-gray-900">{summary.totalCheckouts}</div>
      <div class="text-sm text-gray-600">Total Checkouts</div>
    </div>

    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-2xl font-bold text-gray-900">{summary.totalItemsCheckedOut}</div>
      <div class="text-sm text-gray-600">Total Items Borrowed</div>
    </div>

    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-2xl font-bold text-gray-900">{summary.lateReturnsLast12Months}</div>
      <div class="text-sm text-gray-600">Late Returns (12 mo)</div>
    </div>

    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-2xl font-bold text-gray-900">{summary.longestOverdueDays}</div>
      <div class="text-sm text-gray-600">Longest Overdue (days)</div>
    </div>

    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-2xl font-bold text-gray-900">{summary.damageIncidents}</div>
      <div class="text-sm text-gray-600">Damage Incidents</div>
    </div>

    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="text-sm text-gray-600">Last Return</div>
      <div class="text-sm font-medium text-gray-900 mt-1">{formatDate(summary.lastReturnDate)}</div>
    </div>
  </div>
</section>
