<script lang="ts">
  import { page } from '$app/stores';
  import { app } from '$lib/stores/app.js';
  import type { Member } from '../../domain/entities/member.js';
  import type { ItemToReturn, MemberItemsToReturn, ItemLookupResult } from '../../application/use-cases/index.js';
  import { GearCondition } from '../../domain/types.js';

  // URL params
  const memberId = $derived($page.url.searchParams.get('member'));

  // State
  let mode = $state<'quick' | 'member'>('quick');
  let itemCode = $state('');
  let isLookingUp = $state(false);
  let lookupResult = $state<ItemLookupResult | null>(null);
  let lookupError = $state('');

  let memberSearch = $state('');
  let memberResults = $state<Member[]>([]);
  let isSearchingMember = $state(false);
  let selectedMember = $state<Member | null>(null);
  let memberItems = $state<MemberItemsToReturn | null>(null);

  let returnCondition = $state<GearCondition>(GearCondition.GOOD);
  let returnNotes = $state('');
  let isReturning = $state(false);
  let returnSuccess = $state<{ itemCode: string; checkoutComplete: boolean } | null>(null);

  // Per-item condition state for member mode
  let itemConditions = $state<Record<string, GearCondition>>({});

  const CONDITIONS = [
    { value: GearCondition.EXCELLENT, label: 'Excellent' },
    { value: GearCondition.GOOD, label: 'Good' },
    { value: GearCondition.FAIR, label: 'Fair' },
    { value: GearCondition.NEEDS_REPAIR, label: 'Needs Repair' }
  ];

  function getItemKey(item: ItemToReturn): string {
    return item.gearItem ? item.gearItem.id : `${item.checkoutId}-${item.gearType.id}`;
  }

  function getItemCondition(item: ItemToReturn): GearCondition {
    return itemConditions[getItemKey(item)] ?? GearCondition.GOOD;
  }

  function setItemCondition(item: ItemToReturn, condition: GearCondition) {
    itemConditions = { ...itemConditions, [getItemKey(item)]: condition };
  }

  // Load member if ID provided
  $effect(() => {
    if (memberId) {
      mode = 'member';
      loadMemberItems(memberId);
    }
  });

  async function lookupItem() {
    if (!itemCode.trim()) return;

    isLookingUp = true;
    lookupError = '';
    lookupResult = null;

    try {
      const result = await app.lookupItemByCode(itemCode.trim());
      if (result) {
        lookupResult = result;
        if (!result.checkout) {
          lookupError = 'This item is not currently checked out.';
        }
      } else {
        lookupError = 'Item not found.';
      }
    } finally {
      isLookingUp = false;
    }
  }

  async function handleQuickReturn() {
    if (!lookupResult || !lookupResult.checkout) return;

    isReturning = true;
    try {
      const result = await app.returnItemByCode(itemCode.trim(), returnCondition, returnNotes || undefined);

      if (result.ok) {
        returnSuccess = {
          itemCode: itemCode.trim(),
          checkoutComplete: result.value.checkoutComplete
        };
        // Reset form
        itemCode = '';
        lookupResult = null;
        returnCondition = GearCondition.GOOD;
        returnNotes = '';
      } else {
        const error = result.error;
        if (error.type === 'item_not_found') {
          lookupError = 'Item not found.';
        } else if (error.type === 'item_not_checked_out') {
          lookupError = 'This item is not currently checked out.';
        } else {
          lookupError = 'Failed to process return.';
        }
      }
    } finally {
      isReturning = false;
    }
  }

  async function searchMember() {
    if (!memberSearch.trim()) {
      memberResults = [];
      return;
    }
    isSearchingMember = true;
    try {
      const byId = await app.lookupMemberByCollegeId(memberSearch.trim());
      if (byId) {
        memberResults = [byId];
      } else {
        memberResults = await app.searchMembers(memberSearch.trim());
      }
    } finally {
      isSearchingMember = false;
    }
  }

  async function selectMember(m: Member) {
    selectedMember = m;
    memberResults = [];
    memberSearch = '';
    await loadMemberItems(m.id);
  }

  async function loadMemberItems(id: string) {
    memberItems = await app.getMemberItemsToReturn(id);
    if (memberItems) {
      selectedMember = memberItems.member;
    }
  }

  async function returnMemberItem(item: ItemToReturn) {
    isReturning = true;
    const condition = getItemCondition(item);
    try {
      if (item.gearItem) {
        const result = await app.returnItemByCode(item.gearItem.code, condition, undefined);
        if (result.ok) {
          if (selectedMember) {
            await loadMemberItems(selectedMember.id);
          }
        }
      } else {
        // Bulk return
        const result = await app.returnItems(item.checkoutId, [
          { gearTypeId: item.gearType.id, quantity: 1 }
        ]);
        if (result.ok) {
          if (selectedMember) {
            await loadMemberItems(selectedMember.id);
          }
        }
      }
    } finally {
      isReturning = false;
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function clearMember() {
    selectedMember = null;
    memberItems = null;
    itemConditions = {};
  }

  function clearSuccess() {
    returnSuccess = null;
  }
</script>

<div class="max-w-5xl mx-auto p-6">
  <header class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Return Gear</h1>
  </header>

  <!-- Mode Toggle -->
  <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
    <button
      onclick={() => (mode = 'quick')}
      class="px-4 py-2 rounded-md text-sm font-medium transition-colors
        {mode === 'quick' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
    >
      Quick Return
    </button>
    <button
      onclick={() => (mode = 'member')}
      class="px-4 py-2 rounded-md text-sm font-medium transition-colors
        {mode === 'member' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
    >
      By Member
    </button>
  </div>

  {#if returnSuccess}
    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
      <div>
        <span class="text-green-800 font-medium">Returned: {returnSuccess.itemCode}</span>
        {#if returnSuccess.checkoutComplete}
          <span class="text-green-600 ml-2">(All items returned)</span>
        {/if}
      </div>
      <button onclick={clearSuccess} class="text-green-600 hover:text-green-800">Dismiss</button>
    </div>
  {/if}

  {#if mode === 'quick'}
    <!-- Quick Return Mode -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Scan or Enter Item Code</h2>

      <div class="flex gap-2 mb-4">
        <input
          type="text"
          bind:value={itemCode}
          onkeydown={(e) => e.key === 'Enter' && lookupItem()}
          placeholder="Enter item code (e.g., BIKE-003)..."
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-mono"
          autofocus
        />
        <button
          onclick={lookupItem}
          disabled={isLookingUp || !itemCode.trim()}
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLookingUp ? 'Looking up...' : 'Look Up'}
        </button>
      </div>

      {#if lookupError}
        <div class="p-4 bg-red-50 text-red-700 rounded-lg mb-4">{lookupError}</div>
      {/if}

      {#if lookupResult}
        <div class="border rounded-lg p-4 mb-4">
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="font-medium text-lg">{lookupResult.gearType.name}</div>
              <div class="text-gray-500 font-mono">{lookupResult.gearItem.code}</div>
              <div class="text-sm text-gray-500 mt-1">
                Condition at checkout: {lookupResult.gearItem.condition}
              </div>
            </div>
            {#if lookupResult.member}
              <div class="text-right">
                <div class="text-sm text-gray-500">Checked out by</div>
                <div class="font-medium">{lookupResult.member.fullName}</div>
              </div>
            {/if}
          </div>

          {#if lookupResult.checkout}
            <div class="border-t pt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Return Condition</label>
              <div class="flex flex-wrap gap-2 mb-4">
                {#each CONDITIONS as cond}
                  <button
                    onclick={() => (returnCondition = cond.value)}
                    class="px-4 py-2 rounded-lg border-2 transition-colors
                      {returnCondition === cond.value
                      ? 'border-gray-900 bg-gray-50 text-gray-900 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'}"
                  >
                    {cond.label}
                  </button>
                {/each}
              </div>

              <div class="mb-4">
                <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  bind:value={returnNotes}
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any issues or notes about the item..."
                ></textarea>
              </div>

              <button
                onclick={handleQuickReturn}
                disabled={isReturning}
                class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg"
              >
                {isReturning ? 'Processing...' : 'Return Item'}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Member Mode -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Member's Items</h2>

      {#if !selectedMember}
        <div class="flex gap-2 mb-4">
          <input
            type="text"
            bind:value={memberSearch}
            onkeydown={(e) => e.key === 'Enter' && searchMember()}
            placeholder="Search by college ID or name..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onclick={searchMember}
            disabled={isSearchingMember}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {#if memberResults.length > 0}
          <div class="border rounded-lg divide-y">
            {#each memberResults as m}
              <button
                onclick={() => selectMember(m)}
                class="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <div class="font-medium">{m.fullName}</div>
                  <div class="text-sm text-gray-500">{m.collegeId.value}</div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-4">
          <div>
            <div class="font-medium">{selectedMember.fullName}</div>
            <div class="text-sm text-gray-500">{selectedMember.collegeId.value}</div>
          </div>
          <button onclick={clearMember} class="text-blue-600 hover:underline text-sm">
            Change
          </button>
        </div>

        {#if memberItems && memberItems.items.length > 0}
          {#if memberItems.totalOverdue > 0}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg mb-4">
              {memberItems.totalOverdue} overdue item{memberItems.totalOverdue === 1 ? '' : 's'}
            </div>
          {/if}

          <div class="space-y-3">
            {#each memberItems.items as item}
              <div
                class="border rounded-lg p-4 {item.isOverdue ? 'border-red-300 bg-red-50' : ''}"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-medium">{item.gearType.name}</div>
                    {#if item.gearItem}
                      <div class="text-sm text-gray-500 font-mono">{item.gearItem.code}</div>
                    {:else}
                      <div class="text-sm text-gray-500">
                        {item.quantity - item.returnedQuantity} of {item.quantity} remaining
                      </div>
                    {/if}
                    <div class="text-sm mt-1 {item.isOverdue ? 'text-red-600' : 'text-gray-500'}">
                      Due: {formatDate(item.dueAt)}
                      {#if item.isOverdue}
                        <span class="font-medium">({item.daysOverdue} days overdue)</span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <select
                      value={getItemCondition(item)}
                      onchange={(e) => setItemCondition(item, (e.target as HTMLSelectElement).value as GearCondition)}
                      class="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {#each CONDITIONS as cond}
                        <option value={cond.value}>{cond.label}</option>
                      {/each}
                    </select>
                    <button
                      onclick={() => returnMemberItem(item)}
                      disabled={isReturning}
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      Return
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if memberItems}
          <div class="text-center py-8 text-gray-500">No items to return</div>
        {:else}
          <div class="text-center py-8 text-gray-500">Loading...</div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
