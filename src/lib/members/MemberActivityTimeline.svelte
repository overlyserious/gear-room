<script lang="ts">
  import type { TimelineEvent, TimelineEventType } from '../../application/use-cases/member-history-use-cases.js';

  let { events, memberId }: { events: TimelineEvent[]; memberId: string } = $props();

  let typeFilter = $state<TimelineEventType | ''>('');
  let fromDate = $state('');
  let toDate = $state('');

  const filteredEvents = $derived.by(() => {
    let result = events;

    if (typeFilter) {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (fromDate) {
      const from = new Date(fromDate);
      result = result.filter((e) => e.occurredAt >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => e.occurredAt <= to);
    }

    return result;
  });

  function formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function exportCsv() {
    const rows = [['Date', 'Type', 'Description', 'Checkout ID', 'Days Late']];
    for (const e of filteredEvents) {
      rows.push([
        e.occurredAt.toISOString(),
        e.type,
        e.description,
        e.checkoutId,
        e.daysLate !== null ? String(e.daysLate) : ''
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member-history-${memberId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const eventTypeConfig: Record<TimelineEventType, { label: string; icon: string; color: string }> = {
    checkout: { label: 'Checkout', icon: '→', color: 'text-blue-600' },
    return: { label: 'Return', icon: '←', color: 'text-green-600' }
  };
</script>

<section class="bg-white rounded-lg shadow p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold">Activity Timeline</h2>
    <button
      onclick={exportCsv}
      disabled={filteredEvents.length === 0}
      class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
    >
      Export CSV
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3 mb-4">
    <select
      bind:value={typeFilter}
      class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Events</option>
      <option value="checkout">Checkouts</option>
      <option value="return">Returns</option>
    </select>

    <div class="flex items-center gap-2 text-sm">
      <label for="from-date" class="text-gray-600">From</label>
      <input
        id="from-date"
        type="date"
        bind:value={fromDate}
        class="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>

    <div class="flex items-center gap-2 text-sm">
      <label for="to-date" class="text-gray-600">To</label>
      <input
        id="to-date"
        type="date"
        bind:value={toDate}
        class="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>

    {#if typeFilter || fromDate || toDate}
      <button
        onclick={() => { typeFilter = ''; fromDate = ''; toDate = ''; }}
        class="px-3 py-1.5 text-sm text-blue-600 hover:underline"
      >
        Clear filters
      </button>
    {/if}
  </div>

  <!-- Events -->
  {#if filteredEvents.length === 0}
    <p class="text-gray-500 text-sm py-4">No activity found.</p>
  {:else}
    <div class="space-y-0 divide-y">
      {#each filteredEvents as event}
        {@const config = eventTypeConfig[event.type]}
        <div class="py-3 flex items-start gap-3">
          <span class="text-lg {config.color} w-6 text-center flex-shrink-0 mt-0.5">{config.icon}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm">{event.description}</div>
            <div class="text-xs text-gray-500 mt-0.5">{formatDateTime(event.occurredAt)}</div>
          </div>
          {#if event.daysLate !== null && event.daysLate > 0}
            <span class="text-xs text-red-600 font-medium flex-shrink-0">
              {event.daysLate}d late
            </span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="mt-3 text-xs text-gray-400">
      Showing {filteredEvents.length} of {events.length} events
    </div>
  {/if}
</section>
