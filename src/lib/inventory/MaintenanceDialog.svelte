<script lang="ts">
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
    onSubmit: (notes?: string) => void;
    onCancel: () => void;
  } = $props();

  let notes = $state('');

  $effect(() => {
    if (open) {
      notes = '';
    }
  });

  function handleSubmit() {
    onSubmit(notes.trim() || undefined);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={onCancel}>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Send to Maintenance</h3>
      {#if itemCode}
        <p class="text-sm text-gray-500 mb-4">Item: <span class="font-mono">{itemCode}</span></p>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="mb-4">
          <label for="maint-notes" class="block text-sm font-medium text-gray-700 mb-1">
            Reason / Notes
          </label>
          <textarea
            id="maint-notes"
            bind:value={notes}
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            placeholder="Describe the issue..."
          ></textarea>
        </div>

        <div class="flex justify-end gap-3">
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
            disabled={loading}
            class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Send to Maintenance'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
