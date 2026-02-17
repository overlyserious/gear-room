<script lang="ts">
  import type { GearItem } from '../../domain/entities/gear-item.js';
  import StatusBadge from './StatusBadge.svelte';
  import ConditionBadge from './ConditionBadge.svelte';

  let { item }: { item: GearItem } = $props();
</script>

<tr class={item.status === 'RETIRED' ? 'opacity-50' : ''}>
  <td class="py-3 font-mono text-sm">{item.code}</td>
  <td class="py-3"><ConditionBadge condition={item.condition} /></td>
  <td class="py-3"><StatusBadge status={item.status} /></td>
  <td class="py-3 text-sm text-gray-500">{item.notes ?? ''}</td>
</tr>
