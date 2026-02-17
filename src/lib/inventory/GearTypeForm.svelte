<script lang="ts">
  import { GearCategory, TrackingMode } from '../../domain/types.js';
  import type { GearType } from '../../domain/entities/gear-type.js';

  let {
    open,
    editingType = null,
    loading = false,
    error = '',
    onSubmit,
    onCancel
  }: {
    open: boolean;
    editingType?: GearType | null;
    loading?: boolean;
    error?: string;
    onSubmit: (data: {
      name: string;
      category: GearCategory;
      trackingMode: TrackingMode;
      checkoutDurationDays: number;
      totalQuantity?: number;
      notes?: string;
    }) => void;
    onCancel: () => void;
  } = $props();

  const isEditing = $derived(editingType !== null);

  let name = $state('');
  let category = $state<GearCategory>(GearCategory.OTHER);
  let trackingMode = $state<TrackingMode>(TrackingMode.INDIVIDUAL);
  let checkoutDurationDays = $state(7);
  let totalQuantity = $state(0);
  let notes = $state('');

  const categories = Object.values(GearCategory);

  function formatCategory(cat: string): string {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Reset form when opening or switching between create/edit
  $effect(() => {
    if (open) {
      if (editingType) {
        name = editingType.name;
        category = editingType.category;
        trackingMode = editingType.trackingMode;
        checkoutDurationDays = editingType.checkoutDurationDays;
        totalQuantity = editingType.totalQuantity;
        notes = editingType.notes ?? '';
      } else {
        name = '';
        category = GearCategory.OTHER;
        trackingMode = TrackingMode.INDIVIDUAL;
        checkoutDurationDays = 7;
        totalQuantity = 0;
        notes = '';
      }
    }
  });

  const canSubmit = $derived(
    name.trim().length > 0 &&
      checkoutDurationDays > 0 &&
      (trackingMode !== TrackingMode.BULK || totalQuantity >= 0)
  );

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      category,
      trackingMode,
      checkoutDurationDays,
      totalQuantity: trackingMode === TrackingMode.BULK ? totalQuantity : undefined,
      notes: notes.trim() || undefined
    });
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={onCancel}>
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Edit Gear Type' : 'Add Gear Type'}
      </h3>

      {#if error}
        <div class="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div>
          <label for="gt-name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            id="gt-name"
            type="text"
            bind:value={name}
            placeholder="e.g., MSR Hubba Hubba 2P Tent"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label for="gt-category" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            id="gt-category"
            bind:value={category}
            disabled={isEditing}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
          >
            {#each categories as cat}
              <option value={cat}>{formatCategory(cat)}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tracking Mode</label>
          <div class="flex gap-3">
            <button
              type="button"
              onclick={() => (trackingMode = TrackingMode.INDIVIDUAL)}
              disabled={isEditing}
              class="flex-1 px-4 py-2 rounded-lg border-2 transition-colors disabled:opacity-50
                {trackingMode === TrackingMode.INDIVIDUAL
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-400'}"
            >
              Individual
            </button>
            <button
              type="button"
              onclick={() => (trackingMode = TrackingMode.BULK)}
              disabled={isEditing}
              class="flex-1 px-4 py-2 rounded-lg border-2 transition-colors disabled:opacity-50
                {trackingMode === TrackingMode.BULK
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-400'}"
            >
              Bulk
            </button>
          </div>
        </div>

        <div>
          <label for="gt-duration" class="block text-sm font-medium text-gray-700 mb-1">
            Checkout Duration (days)
          </label>
          <input
            id="gt-duration"
            type="number"
            bind:value={checkoutDurationDays}
            min="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {#if trackingMode === TrackingMode.BULK}
          <div>
            <label for="gt-quantity" class="block text-sm font-medium text-gray-700 mb-1">
              Total Quantity
            </label>
            <input
              id="gt-quantity"
              type="number"
              bind:value={totalQuantity}
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        {/if}

        <div>
          <label for="gt-notes" class="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="gt-notes"
            bind:value={notes}
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Additional details..."
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
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Gear Type'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
