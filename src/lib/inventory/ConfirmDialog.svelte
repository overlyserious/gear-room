<script lang="ts">
  let {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    variant = 'danger',
    loading = false,
    onConfirm,
    onCancel
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();

  const confirmClasses = $derived(
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-amber-600 hover:bg-amber-700 text-white'
  );
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={onCancel}>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p class="text-gray-600 mb-6">{message}</p>

      <div class="flex justify-end gap-3">
        <button
          onclick={onCancel}
          disabled={loading}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onclick={onConfirm}
          disabled={loading}
          class="px-4 py-2 rounded-lg {confirmClasses} disabled:opacity-50"
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
