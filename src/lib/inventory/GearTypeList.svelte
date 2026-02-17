<script lang="ts">
  import type { GearTypeListItem } from '../../application/use-cases/inventory-use-cases.js';
  import GearTypeCard from './GearTypeCard.svelte';

  let { items, onSelectType }: { items: GearTypeListItem[]; onSelectType: (id: string) => void } =
    $props();

  // Group items by categoryLabel (already sorted by category then name from use case)
  const groups = $derived.by(() => {
    const map = new Map<string, GearTypeListItem[]>();
    for (const item of items) {
      const group = map.get(item.categoryLabel) ?? [];
      group.push(item);
      map.set(item.categoryLabel, group);
    }
    return [...map.entries()];
  });
</script>

{#if items.length === 0}
  <div class="text-center py-8 text-gray-500">
    No gear types found. Add your first gear type to get started.
  </div>
{:else}
  <div class="space-y-6">
    {#each groups as [categoryLabel, categoryItems]}
      <div>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {categoryLabel} ({categoryItems.length} type{categoryItems.length !== 1 ? 's' : ''})
        </h2>
        <div class="space-y-2">
          {#each categoryItems as item}
            <GearTypeCard {item} onclick={() => onSelectType(item.gearType.id)} />
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
