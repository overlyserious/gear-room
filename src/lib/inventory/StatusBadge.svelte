<script lang="ts">
  import { GearStatus } from '../../domain/types.js';

  let { status }: { status: GearStatus } = $props();

  const config: Record<GearStatus, { label: string; classes: string }> = {
    [GearStatus.AVAILABLE]: { label: 'Available', classes: 'bg-green-100 text-green-800' },
    [GearStatus.CHECKED_OUT]: { label: 'Checked Out', classes: 'bg-blue-100 text-blue-800' },
    [GearStatus.MAINTENANCE]: { label: 'Maintenance', classes: 'bg-amber-100 text-amber-800' },
    [GearStatus.RETIRED]: { label: 'Retired', classes: 'bg-gray-100 text-gray-600' }
  };
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {config[status].classes}">
  {config[status].label}
</span>
