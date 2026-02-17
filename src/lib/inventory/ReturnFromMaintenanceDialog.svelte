<script lang="ts">
  import { GearCondition } from '../../domain/types.js';

  let {
    open,
    itemCode = '',
    loading = false,
    onSubmit,
    onCancel
  }: {
    open: boolean;
    itemCode?: string;
    loading?: boolean;
    onSubmit: (condition: GearCondition) => void;
    onCancel: () => void;
  } = $props();

  let condition = $state<GearCondition>(GearCondition.GOOD);

  const CONDITIONS = [
    { value: GearCondition.EXCELLENT, label: 'Excellent', color: 'green' },
    { value: GearCondition.GOOD, label: 'Good', color: 'blue' },
    { value: GearCondition.FAIR, label: 'Fair', color: 'yellow' },
    { value: GearCondition.NEEDS_REPAIR, label: 'Needs Repair', color: 'red' }
  ];

  $effect(() => {
    if (open) {
      condition = GearCondition.GOOD;
    }
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={onCancel}>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Return from Maintenance</h3>
      {#if itemCode}
        <p class="text-sm text-gray-500 mb-4">Item: <span class="font-mono">{itemCode}</span></p>
      {/if}

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Condition After Repair</label>
        <div class="flex flex-wrap gap-2">
          {#each CONDITIONS as cond}
            <button
              onclick={() => (condition = cond.value)}
              class="px-4 py-2 rounded-lg border-2 transition-colors
                {condition === cond.value
                ? cond.color === 'green'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : cond.color === 'blue'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : cond.color === 'yellow'
                      ? 'border-yellow-600 bg-yellow-50 text-yellow-800'
                      : 'border-red-600 bg-red-50 text-red-800'
                : 'border-gray-200 hover:border-gray-400'}"
            >
              {cond.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          onclick={onCancel}
          disabled={loading}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onclick={() => onSubmit(condition)}
          disabled={loading}
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Return to Service'}
        </button>
      </div>
    </div>
  </div>
{/if}
