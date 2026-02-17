<script lang="ts">
  import { GearCondition } from '../../domain/types.js';
  import type { GearItem } from '../../domain/entities/gear-item.js';

  let {
    open,
    existingItems = [],
    loading = false,
    error = '',
    onSubmit,
    onCancel
  }: {
    open: boolean;
    existingItems?: GearItem[];
    loading?: boolean;
    error?: string;
    onSubmit: (data: { code: string; condition: GearCondition; notes?: string }) => void;
    onCancel: () => void;
  } = $props();

  let code = $state('');
  let condition = $state<GearCondition>(GearCondition.EXCELLENT);
  let notes = $state('');

  const CONDITIONS = [
    { value: GearCondition.EXCELLENT, label: 'Excellent', color: 'green' },
    { value: GearCondition.GOOD, label: 'Good', color: 'blue' },
    { value: GearCondition.FAIR, label: 'Fair', color: 'yellow' },
    { value: GearCondition.NEEDS_REPAIR, label: 'Needs Repair', color: 'red' }
  ];

  // Suggest the next code based on existing items
  const suggestedCode = $derived.by(() => {
    if (existingItems.length === 0) return '';
    const codes = existingItems.map((i) => i.code);
    // Find the common prefix (e.g., "BIKE-")
    const firstCode = codes[0];
    const dashIndex = firstCode.lastIndexOf('-');
    if (dashIndex === -1) return '';
    const prefix = firstCode.substring(0, dashIndex + 1);
    // Find the highest number
    let max = 0;
    for (const c of codes) {
      if (c.startsWith(prefix)) {
        const num = parseInt(c.substring(prefix.length), 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return prefix + String(max + 1).padStart(3, '0');
  });

  // Reset form when opening
  $effect(() => {
    if (open) {
      code = suggestedCode;
      condition = GearCondition.EXCELLENT;
      notes = '';
    }
  });

  const canSubmit = $derived(code.trim().length > 0);

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      code: code.trim().toUpperCase(),
      condition,
      notes: notes.trim() || undefined
    });
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={onCancel}>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Item</h3>

      {#if error}
        <div class="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div>
          <label for="item-code" class="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
          <input
            id="item-code"
            type="text"
            bind:value={code}
            placeholder="e.g., BIKE-004"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
          />
          {#if suggestedCode && code !== suggestedCode}
            <button
              type="button"
              onclick={() => (code = suggestedCode)}
              class="text-xs text-blue-600 hover:underline mt-1"
            >
              Use suggested: {suggestedCode}
            </button>
          {/if}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Condition</label>
          <div class="flex flex-wrap gap-2">
            {#each CONDITIONS as cond}
              <button
                type="button"
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

        <div>
          <label for="item-notes" class="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="item-notes"
            bind:value={notes}
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Any details about this item..."
          ></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onclick={onCancel}
            disabled={loading}
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
