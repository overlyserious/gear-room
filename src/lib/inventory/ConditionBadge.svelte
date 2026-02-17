<script lang="ts">
  import { GearCondition } from '../../domain/types.js';

  let { condition }: { condition: GearCondition } = $props();

  const config: Record<GearCondition, { label: string; classes: string }> = {
    [GearCondition.EXCELLENT]: { label: 'Excellent', classes: 'bg-green-100 text-green-800' },
    [GearCondition.GOOD]: { label: 'Good', classes: 'bg-blue-100 text-blue-800' },
    [GearCondition.FAIR]: { label: 'Fair', classes: 'bg-amber-100 text-amber-800' },
    [GearCondition.NEEDS_REPAIR]: { label: 'Needs Repair', classes: 'bg-red-100 text-red-800' },
    [GearCondition.RETIRED]: { label: 'Retired', classes: 'bg-gray-100 text-gray-600' }
  };
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {config[condition].classes}">
  {config[condition].label}
</span>
