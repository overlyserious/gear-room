<script lang="ts">
  import { app } from '$lib/stores/app.js';
  import { GearCategory, GearCondition, GearStatus, TrackingMode } from '../../domain/types.js';
  import type { GearTypeListItem, GearTypeDetail } from '../../application/use-cases/inventory-use-cases.js';
  import type { GearItem } from '../../domain/entities/gear-item.js';
  import GearTypeList from '$lib/inventory/GearTypeList.svelte';
  import GearTypeDetailPanel from '$lib/inventory/GearTypeDetailPanel.svelte';
  import GearTypeForm from '$lib/inventory/GearTypeForm.svelte';
  import GearItemForm from '$lib/inventory/GearItemForm.svelte';
  import MaintenanceDialog from '$lib/inventory/MaintenanceDialog.svelte';
  import ReturnFromMaintenanceDialog from '$lib/inventory/ReturnFromMaintenanceDialog.svelte';
  import EditGearItemDialog from '$lib/inventory/EditGearItemDialog.svelte';
  import ConfirmDialog from '$lib/inventory/ConfirmDialog.svelte';

  let items = $state<GearTypeListItem[]>([]);
  let loading = $state(true);
  let error = $state('');
  let successMessage = $state('');

  // Filters
  let searchTerm = $state('');
  let selectedCategory = $state('');
  let selectedStatus = $state('');

  // Detail view
  let selectedDetail = $state<GearTypeDetail | null>(null);
  let detailLoading = $state(false);

  // Modal state
  let showGearTypeForm = $state(false);
  let editingGearType = $state<GearTypeDetail['gearType'] | null>(null);
  let gearTypeFormLoading = $state(false);
  let gearTypeFormError = $state('');

  let showGearItemForm = $state(false);
  let gearItemFormLoading = $state(false);
  let gearItemFormError = $state('');

  let showEditItemDialog = $state(false);
  let editingItem = $state<GearItem | null>(null);
  let editItemLoading = $state(false);
  let editItemError = $state('');

  let showMaintenanceDialog = $state(false);
  let maintenanceItem = $state<GearItem | null>(null);
  let maintenanceLoading = $state(false);

  let showReturnMaintenanceDialog = $state(false);
  let returnMaintenanceItem = $state<GearItem | null>(null);
  let returnMaintenanceLoading = $state(false);

  let showConfirmDialog = $state(false);
  let confirmConfig = $state<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    action: () => Promise<void>;
  }>({ title: '', message: '', confirmLabel: '', variant: 'danger', action: async () => {} });
  let confirmLoading = $state(false);

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const categories = Object.values(GearCategory);
  const statuses = Object.values(GearStatus);

  function formatCategory(cat: string): string {
    return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function showSuccess(msg: string) {
    successMessage = msg;
    setTimeout(() => { successMessage = ''; }, 4000);
  }

  function formatError(err: { type: string; [key: string]: unknown }): string {
    switch (err.type) {
      case 'empty_name': return 'Name is required.';
      case 'duplicate_name': return 'A gear type with this name already exists.';
      case 'bulk_requires_quantity': return 'Bulk items require a quantity.';
      case 'invalid_quantity': return 'Invalid quantity.';
      case 'not_found': return 'Not found.';
      case 'has_checked_out_items': return `Cannot delete: ${(err as { count?: number }).count ?? 'some'} item(s) are currently checked out.`;
      case 'gear_type_not_found': return 'Gear type not found.';
      case 'not_individual_tracked': return 'This gear type uses bulk tracking.';
      case 'duplicate_code': return 'An item with this code already exists.';
      case 'empty_code': return 'Item code is required.';
      case 'invalid_code_format': return 'Code must be alphanumeric with dashes only (e.g., BIKE-001).';
      case 'is_checked_out': return 'Cannot modify: item is currently checked out.';
      case 'is_retired': return 'Item is already retired.';
      case 'already_in_maintenance': return 'Item is already in maintenance.';
      case 'not_in_maintenance': return 'Item is not in maintenance.';
      case 'already_retired': return 'Item is already retired.';
      default: return `Error: ${err.type}`;
    }
  }

  // ========== Data Loading ==========

  async function loadItems() {
    loading = true;
    error = '';
    try {
      const filters: { searchTerm?: string; category?: GearCategory; hasItemsInStatus?: GearStatus } = {};
      if (searchTerm.trim()) filters.searchTerm = searchTerm.trim();
      if (selectedCategory) filters.category = selectedCategory as GearCategory;
      if (selectedStatus) filters.hasItemsInStatus = selectedStatus as GearStatus;
      items = await app.listGearTypesWithStatus(filters);
    } catch {
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
    } catch {
      error = 'Failed to load gear type details.';
    } finally {
      detailLoading = false;
    }
  }

  async function refreshDetail() {
    if (!selectedDetail) return;
    const result = await app.getGearTypeDetail(selectedDetail.gearType.id);
    if (result.ok) {
      selectedDetail = result.value;
    }
  }

  function backToList() {
    selectedDetail = null;
    loadItems();
  }

  function handleSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadItems, 300);
  }

  function handleFilterChange() {
    loadItems();
  }

  // ========== Gear Type CRUD ==========

  function openCreateGearType() {
    editingGearType = null;
    gearTypeFormError = '';
    showGearTypeForm = true;
  }

  function openEditGearType() {
    if (!selectedDetail) return;
    editingGearType = selectedDetail.gearType;
    gearTypeFormError = '';
    showGearTypeForm = true;
  }

  async function handleGearTypeSubmit(data: {
    name: string;
    category: GearCategory;
    trackingMode: TrackingMode;
    checkoutDurationDays: number;
    totalQuantity?: number;
    notes?: string;
  }) {
    gearTypeFormLoading = true;
    gearTypeFormError = '';
    try {
      if (editingGearType) {
        const result = await app.updateGearType({
          id: editingGearType.id,
          name: data.name,
          checkoutDurationDays: data.checkoutDurationDays,
          notes: data.notes
        });
        if (result.ok) {
          showGearTypeForm = false;
          showSuccess('Gear type updated.');
          await refreshDetail();
        } else {
          gearTypeFormError = formatError(result.error);
        }
      } else {
        const result = await app.createGearType({
          name: data.name,
          category: data.category,
          trackingMode: data.trackingMode,
          checkoutDurationDays: data.checkoutDurationDays,
          totalQuantity: data.totalQuantity,
          notes: data.notes
        });
        if (result.ok) {
          showGearTypeForm = false;
          showSuccess('Gear type created.');
          await loadItems();
        } else {
          gearTypeFormError = formatError(result.error);
        }
      }
    } catch {
      gearTypeFormError = 'An unexpected error occurred.';
    } finally {
      gearTypeFormLoading = false;
    }
  }

  function openDeleteGearType() {
    if (!selectedDetail) return;
    const name = selectedDetail.gearType.name;
    confirmConfig = {
      title: 'Delete Gear Type',
      message: `Are you sure you want to delete "${name}"? This will also delete all its items. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async () => {
        const result = await app.deleteGearType(selectedDetail!.gearType.id);
        if (result.ok) {
          showConfirmDialog = false;
          selectedDetail = null;
          showSuccess('Gear type deleted.');
          await loadItems();
        } else {
          error = formatError(result.error);
          showConfirmDialog = false;
        }
      }
    };
    showConfirmDialog = true;
  }

  // ========== Bulk Quantity ==========

  async function handleUpdateBulkQuantity(newQuantity: number) {
    if (!selectedDetail) return;
    const result = await app.updateBulkQuantity(selectedDetail.gearType.id, newQuantity);
    if (result.ok) {
      await refreshDetail();
    } else {
      error = formatError(result.error);
    }
  }

  // ========== Gear Item CRUD ==========

  function openAddItem() {
    gearItemFormError = '';
    showGearItemForm = true;
  }

  async function handleAddItem(data: { code: string; condition: GearCondition; notes?: string }) {
    if (!selectedDetail) return;
    gearItemFormLoading = true;
    gearItemFormError = '';
    try {
      const result = await app.addGearItem({
        gearTypeId: selectedDetail.gearType.id,
        code: data.code,
        condition: data.condition,
        notes: data.notes
      });
      if (result.ok) {
        showGearItemForm = false;
        showSuccess(`Item ${data.code} added.`);
        await refreshDetail();
      } else {
        gearItemFormError = formatError(result.error);
      }
    } catch {
      gearItemFormError = 'An unexpected error occurred.';
    } finally {
      gearItemFormLoading = false;
    }
  }

  // ========== Edit Item ==========

  function openEditItem(item: GearItem) {
    editingItem = item;
    editItemError = '';
    showEditItemDialog = true;
  }

  async function handleEditItem(data: { id: string; condition: GearCondition; notes?: string }) {
    editItemLoading = true;
    editItemError = '';
    try {
      const result = await app.updateGearItem({
        id: data.id,
        condition: data.condition,
        notes: data.notes
      });
      if (result.ok) {
        showEditItemDialog = false;
        showSuccess(`Item updated.`);
        await refreshDetail();
      } else {
        editItemError = formatError(result.error);
      }
    } catch {
      editItemError = 'An unexpected error occurred.';
    } finally {
      editItemLoading = false;
    }
  }

  // ========== Maintenance ==========

  function openMaintenance(item: GearItem) {
    maintenanceItem = item;
    showMaintenanceDialog = true;
  }

  async function handleSendToMaintenance(notes?: string) {
    if (!maintenanceItem) return;
    maintenanceLoading = true;
    try {
      const result = await app.sendItemToMaintenance(maintenanceItem.id, notes);
      if (result.ok) {
        showMaintenanceDialog = false;
        showSuccess(`${maintenanceItem.code} sent to maintenance.`);
        await refreshDetail();
      } else {
        error = formatError(result.error);
        showMaintenanceDialog = false;
      }
    } catch {
      error = 'Failed to send item to maintenance.';
      showMaintenanceDialog = false;
    } finally {
      maintenanceLoading = false;
    }
  }

  // ========== Return from Maintenance ==========

  function openReturnFromMaintenance(item: GearItem) {
    returnMaintenanceItem = item;
    showReturnMaintenanceDialog = true;
  }

  async function handleReturnFromMaintenance(condition: GearCondition) {
    if (!returnMaintenanceItem) return;
    returnMaintenanceLoading = true;
    try {
      const result = await app.returnItemFromMaintenance(returnMaintenanceItem.id, condition);
      if (result.ok) {
        showReturnMaintenanceDialog = false;
        showSuccess(`${returnMaintenanceItem.code} returned to service.`);
        await refreshDetail();
      } else {
        error = formatError(result.error);
        showReturnMaintenanceDialog = false;
      }
    } catch {
      error = 'Failed to return item from maintenance.';
      showReturnMaintenanceDialog = false;
    } finally {
      returnMaintenanceLoading = false;
    }
  }

  // ========== Retire ==========

  function openRetireItem(item: GearItem) {
    confirmConfig = {
      title: 'Retire Item',
      message: `Are you sure you want to retire ${item.code}? This item will be permanently removed from the lending pool.`,
      confirmLabel: 'Retire',
      variant: 'warning',
      action: async () => {
        const result = await app.retireItem(item.id);
        if (result.ok) {
          showConfirmDialog = false;
          showSuccess(`${item.code} retired.`);
          await refreshDetail();
        } else {
          error = formatError(result.error);
          showConfirmDialog = false;
        }
      }
    };
    showConfirmDialog = true;
  }

  async function handleConfirm() {
    confirmLoading = true;
    try {
      await confirmConfig.action();
    } catch {
      error = 'An unexpected error occurred.';
      showConfirmDialog = false;
    } finally {
      confirmLoading = false;
    }
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
    {#if !selectedDetail}
      <button
        onclick={openCreateGearType}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        + Add Gear Type
      </button>
    {/if}
  </header>

  {#if successMessage}
    <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
      <span class="text-green-800 font-medium">{successMessage}</span>
      <button onclick={() => (successMessage = '')} class="text-green-600 hover:text-green-800">
        Dismiss
      </button>
    </div>
  {/if}

  {#if error}
    <div class="p-4 bg-red-50 text-red-700 rounded-lg mb-4 flex items-center justify-between">
      <span>{error}</span>
      <button onclick={() => (error = '')} class="text-red-500 hover:text-red-700">Dismiss</button>
    </div>
  {/if}

  {#if selectedDetail}
    {#if detailLoading}
      <p class="text-gray-500">Loading...</p>
    {:else}
      <GearTypeDetailPanel
        detail={selectedDetail}
        onBack={backToList}
        onEdit={openEditGearType}
        onDelete={openDeleteGearType}
        onAddItem={openAddItem}
        onUpdateBulkQuantity={handleUpdateBulkQuantity}
        onItemEdit={openEditItem}
        onItemMaintenance={openMaintenance}
        onItemReturnFromMaintenance={openReturnFromMaintenance}
        onItemRetire={openRetireItem}
      />
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

<!-- Modals -->
<GearTypeForm
  open={showGearTypeForm}
  editingType={editingGearType}
  loading={gearTypeFormLoading}
  error={gearTypeFormError}
  onSubmit={handleGearTypeSubmit}
  onCancel={() => (showGearTypeForm = false)}
/>

<GearItemForm
  open={showGearItemForm}
  existingItems={selectedDetail?.items ?? []}
  loading={gearItemFormLoading}
  error={gearItemFormError}
  onSubmit={handleAddItem}
  onCancel={() => (showGearItemForm = false)}
/>

<EditGearItemDialog
  open={showEditItemDialog}
  item={editingItem}
  loading={editItemLoading}
  error={editItemError}
  onSubmit={handleEditItem}
  onCancel={() => (showEditItemDialog = false)}
/>

<MaintenanceDialog
  open={showMaintenanceDialog}
  itemCode={maintenanceItem?.code ?? ''}
  loading={maintenanceLoading}
  onSubmit={handleSendToMaintenance}
  onCancel={() => (showMaintenanceDialog = false)}
/>

<ReturnFromMaintenanceDialog
  open={showReturnMaintenanceDialog}
  itemCode={returnMaintenanceItem?.code ?? ''}
  loading={returnMaintenanceLoading}
  onSubmit={handleReturnFromMaintenance}
  onCancel={() => (showReturnMaintenanceDialog = false)}
/>

<ConfirmDialog
  open={showConfirmDialog}
  title={confirmConfig.title}
  message={confirmConfig.message}
  confirmLabel={confirmConfig.confirmLabel}
  variant={confirmConfig.variant}
  loading={confirmLoading}
  onConfirm={handleConfirm}
  onCancel={() => (showConfirmDialog = false)}
/>
