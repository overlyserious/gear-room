<script lang="ts">
  import { app } from '$lib/stores/app.js';
  import { GearCategory, GearStatus } from '../../domain/types.js';
  import type { GearTypeListItem, GearTypeDetail } from '../../application/use-cases/inventory-use-cases.js';
  import GearTypeList from '$lib/inventory/GearTypeList.svelte';
  import GearTypeDetailPanel from '$lib/inventory/GearTypeDetailPanel.svelte';

  let items = $state<GearTypeListItem[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Filters
  let searchTerm = $state('');
  let selectedCategory = $state('');
  let selectedStatus = $state('');

  // Detail view
  let selectedDetail = $state<GearTypeDetail | null>(null);
  let detailLoading = $state(false);

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const categories = Object.values(GearCategory);
  const statuses = Object.values(GearStatus);

  function formatCategory(cat: string): string {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatStatus(status: string): string {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  async function loadItems() {
    loading = true;
    error = '';
    try {
      const filters: { searchTerm?: string; category?: GearCategory; hasItemsInStatus?: GearStatus } = {};
      if (searchTerm.trim()) filters.searchTerm = searchTerm.trim();
      if (selectedCategory) filters.category = selectedCategory as GearCategory;
      if (selectedStatus) filters.hasItemsInStatus = selectedStatus as GearStatus;

      items = await app.listGearTypesWithStatus(filters);
    } catch (e) {
      error = 'Failed to load inventory.';
    } finally {
      loading = false;
    }
  }

  async function selectType(id: string) {
    detailLoading = true;
    error = '';
    try {
      const result = await app.getGearTypeDetail(id);
      if (result.ok) {
        selectedDetail = result.value;
      } else {
        error = 'Gear type not found.';
      }
    } catch (e) {
      error = 'Failed to load gear type details.';
    } finally {
      detailLoading = false;
    }
  }

  function backToList() {
    selectedDetail = null;
  }

  function handleSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadItems, 300);
  }

  function handleFilterChange() {
    loadItems();
  }

  // Load on mount
  $effect(() => {
    loadItems();
  });
</script>

<div class="max-w-6xl mx-auto p-6">
  <header class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Inventory Management</h1>
      <a href="/" class="text-blue-600 hover:underline text-sm">Back to Home</a>
    </div>
  </header>

  {#if error}
    <div class="p-4 bg-red-50 text-red-700 rounded-lg mb-4">{error}</div>
  {/if}

  {#if selectedDetail}
    {#if detailLoading}
      <p class="text-gray-500">Loading...</p>
    {:else}
      <GearTypeDetailPanel detail={selectedDetail} onBack={backToList} />
    {/if}
  {:else}
    <!-- Search and filter bar -->
    <div class="flex gap-2 mb-6">
      <input
        type="text"
        bind:value={searchTerm}
        oninput={handleSearchInput}
        placeholder="Search by name..."
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <select
        bind:value={selectedCategory}
        onchange={handleFilterChange}
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        {#each categories as cat}
          <option value={cat}>{formatCategory(cat)}</option>
        {/each}
      </select>
      <select
        bind:value={selectedStatus}
        onchange={handleFilterChange}
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        {#each statuses as status}
          <option value={status}>{formatStatus(status)}</option>
        {/each}
      </select>
    </div>

    {#if loading}
      <p class="text-gray-500">Loading...</p>
    {:else}
      <GearTypeList {items} onSelectType={selectType} />
    {/if}
  {/if}
</div>
