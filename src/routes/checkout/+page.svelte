<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.js';
  import type { Member } from '../../domain/entities/member.js';
  import type { GearType } from '../../domain/entities/gear-type.js';
  import type { GearItem } from '../../domain/entities/gear-item.js';
  import type { GearSearchResult } from '../../application/use-cases/index.js';
  import { GearCategory } from '../../domain/types.js';

  // URL params
  const memberId = $derived($page.url.searchParams.get('member'));

  // State
  let member = $state<Member | null>(null);
  let memberSearch = $state('');
  let memberResults = $state<Member[]>([]);
  let isSearchingMember = $state(false);

  let gearSearch = $state('');
  let selectedCategory = $state<string>('');
  let gearResults = $state<GearSearchResult[]>([]);
  let isSearchingGear = $state(false);

  // Cart items
  let cart = $state<
    Array<{
      gearType: GearType;
      gearItem?: GearItem;
      quantity: number;
    }>
  >([]);

  let checkoutNotes = $state('');
  let isCheckingOut = $state(false);
  let checkoutError = $state('');
  let checkoutSuccess = $state(false);

  // Staff member ID (hardcoded for now - would come from auth)
  const STAFF_MEMBER_ID = 'staff-001';

  // Load member if ID provided
  $effect(() => {
    if (memberId) {
      loadMember(memberId);
    }
  });

  // Load gear on mount
  $effect(() => {
    searchGear();
  });

  async function loadMember(id: string) {
    const eligibility = await app.getCheckoutEligibility(id);
    if (eligibility.eligible) {
      member = eligibility.member;
    } else if (eligibility.member) {
      member = eligibility.member;
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
    const eligibility = await app.getCheckoutEligibility(m.id);
    if (eligibility.eligible) {
      member = m;
      memberResults = [];
      memberSearch = '';
    } else {
      checkoutError = 'This member is not eligible to check out gear.';
    }
  }

  async function searchGear() {
    isSearchingGear = true;
    try {
      gearResults = await app.searchAvailableGear(
        gearSearch.trim() || undefined,
        selectedCategory || undefined
      );
    } finally {
      isSearchingGear = false;
    }
  }

  function addToCart(gearType: GearType, gearItem?: GearItem) {
    // Check if already in cart
    const existing = cart.find(
      (c) =>
        (gearItem && c.gearItem?.id === gearItem.id) ||
        (!gearItem && c.gearType.id === gearType.id && !c.gearItem)
    );

    if (existing) {
      if (!gearItem) {
        // Bulk item - increment quantity
        existing.quantity++;
      }
      cart = [...cart];
    } else {
      cart = [...cart, { gearType, gearItem, quantity: 1 }];
    }
  }

  function removeFromCart(index: number) {
    cart = cart.filter((_, i) => i !== index);
  }

  function updateQuantity(index: number, delta: number) {
    const item = cart[index];
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      removeFromCart(index);
    } else {
      item.quantity = newQty;
      cart = [...cart];
    }
  }

  async function handleCheckout() {
    if (!member || cart.length === 0) return;

    isCheckingOut = true;
    checkoutError = '';

    try {
      const items = cart.map((c) => {
        if (c.gearItem) {
          return { itemCode: c.gearItem.code };
        } else {
          return { gearTypeId: c.gearType.id, quantity: c.quantity };
        }
      });

      const result = await app.createCheckout({
        memberId: member.id,
        staffMemberId: STAFF_MEMBER_ID,
        items,
        notes: checkoutNotes || undefined
      });

      if (result.ok) {
        checkoutSuccess = true;
        cart = [];
        // Refresh gear availability
        await searchGear();
      } else {
        const error = result.error;
        if (error.type === 'member_not_eligible') {
          checkoutError = `Member not eligible: ${error.reasons.join(', ')}`;
        } else if (error.type === 'gear_item_not_found') {
          checkoutError = `Item not found: ${error.code}`;
        } else if (error.type === 'gear_item_not_available') {
          checkoutError = `Item not available: ${error.code} (${error.status})`;
        } else if (error.type === 'insufficient_quantity') {
          checkoutError = `Not enough available (requested ${error.requested}, available ${error.available})`;
        } else {
          checkoutError = 'Failed to complete checkout';
        }
      }
    } finally {
      isCheckingOut = false;
    }
  }

  function formatCategory(cat: string): string {
    return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function startNewCheckout() {
    checkoutSuccess = false;
    member = null;
    cart = [];
    checkoutNotes = '';
  }
</script>

<div class="max-w-5xl mx-auto p-6">
  <header class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Check Out Gear</h1>
  </header>

  {#if checkoutSuccess}
    <!-- Success State -->
    <div class="bg-white border border-green-200 rounded-lg p-8 text-center">
      <svg class="w-12 h-12 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Checkout Complete</h2>
      <p class="text-gray-600 mb-6">Gear has been checked out successfully.</p>
      <div class="flex items-center justify-center gap-3">
        <button
          onclick={startNewCheckout}
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Checkout
        </button>
        <a href="/" class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 inline-block">
          Back to Home
        </a>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Member & Gear Selection -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Member Selection -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-4">Member</h2>

          {#if member}
            <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div class="font-medium">{member.fullName}</div>
                <div class="text-sm text-gray-500">{member.collegeId.value}</div>
              </div>
              <button onclick={() => (member = null)} class="text-blue-600 hover:underline text-sm">
                Change
              </button>
            </div>
          {:else}
            <div class="flex gap-2">
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
              <div class="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {#each memberResults as m}
                  <button
                    onclick={() => selectMember(m)}
                    class="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <div class="font-medium">{m.fullName}</div>
                      <div class="text-sm text-gray-500">{m.collegeId.value}</div>
                    </div>
                    {#if m.canCheckout()}
                      <span class="text-green-600 text-sm">Eligible</span>
                    {:else}
                      <span class="text-red-600 text-sm">Not eligible</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <!-- Gear Selection -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-4">Available Gear</h2>

          <div class="flex gap-2 mb-4">
            <input
              type="text"
              bind:value={gearSearch}
              onkeydown={(e) => e.key === 'Enter' && searchGear()}
              oninput={() => { clearTimeout(undefined); setTimeout(searchGear, 300); }}
              placeholder="Search gear..."
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              bind:value={selectedCategory}
              onchange={searchGear}
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {#each Object.values(GearCategory) as cat}
                <option value={cat}>{formatCategory(cat)}</option>
              {/each}
            </select>
          </div>

          {#if isSearchingGear}
            <div class="text-center py-8 text-gray-500">Loading gear...</div>
          {:else if gearResults.length === 0}
            <div class="text-center py-8 text-gray-500">No gear found</div>
          {:else}
            <div class="space-y-3 max-h-96 overflow-y-auto">
              {#each gearResults as result}
                <div class="border rounded-lg p-4">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <div class="font-medium">{result.gearType.name}</div>
                      <div class="text-sm text-gray-500">{formatCategory(result.gearType.category)}</div>
                    </div>
                    <div class="text-sm text-gray-500">
                      {result.gearType.checkoutDurationDays} day checkout
                    </div>
                  </div>

                  {#if result.availableItems}
                    <!-- Individual items -->
                    {#if result.availableItems.length === 0}
                      <div class="text-sm text-gray-400">No items available</div>
                    {:else}
                      <div class="flex flex-wrap gap-2">
                        {#each result.availableItems as item}
                          <button
                            onclick={() => addToCart(result.gearType, item)}
                            disabled={cart.some((c) => c.gearItem?.id === item.id)}
                            class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                          >
                            {item.code}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  {:else if result.availableQuantity !== undefined}
                    <!-- Bulk item -->
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">
                        {result.availableQuantity} available
                      </span>
                      {#if result.availableQuantity > 0}
                        <button
                          onclick={() => addToCart(result.gearType)}
                          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column: Cart -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-6 sticky top-6">
          <h2 class="text-lg font-semibold mb-4">Cart ({cart.length} items)</h2>

          {#if checkoutError}
            <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{checkoutError}</div>
          {/if}

          {#if cart.length === 0}
            <div class="text-center py-8 text-gray-500">No items in cart</div>
          {:else}
            <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {#each cart as item, index}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">{item.gearType.name}</div>
                    {#if item.gearItem}
                      <div class="text-xs text-gray-500 font-mono">{item.gearItem.code}</div>
                    {:else}
                      <div class="flex items-center gap-2 mt-1">
                        <button
                          onclick={() => updateQuantity(index, -1)}
                          class="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span class="text-sm">{item.quantity}</span>
                        <button
                          onclick={() => updateQuantity(index, 1)}
                          class="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    {/if}
                  </div>
                  <button
                    onclick={() => removeFromCart(index)}
                    class="text-red-600 hover:text-red-800 text-sm ml-2"
                  >
                    Remove
                  </button>
                </div>
              {/each}
            </div>

            <div class="mb-4">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                bind:value={checkoutNotes}
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Any special notes..."
              ></textarea>
            </div>

            <button
              onclick={handleCheckout}
              disabled={!member || cart.length === 0 || isCheckingOut}
              class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {#if isCheckingOut}
                Processing...
              {:else if !member}
                Select a Member
              {:else}
                Complete Checkout
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
