<script lang="ts">
  import { TrackingMode } from '../../domain/types.js';

  let { mode }: { mode: TrackingMode } = $props();

  const config: Record<TrackingMode, { label: string; classes: string }> = {
    [TrackingMode.INDIVIDUAL]: { label: 'Individual', classes: 'bg-indigo-100 text-indigo-800' },
    [TrackingMode.BULK]: { label: 'Bulk', classes: 'bg-purple-100 text-purple-800' }
  };
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {config[mode].classes}">
  {config[mode].label}
</span>
