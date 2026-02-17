<script lang="ts">
  import { app } from '$lib/stores/app.js';
  import type { Member } from '../domain/entities/member.js';
  import type { CheckoutEligibility } from '../application/use-cases/index.js';

  // State
  let searchQuery = $state('');
  let searchResults = $state<Member[]>([]);
  let selectedMember = $state<Member | null>(null);
  let eligibility = $state<CheckoutEligibility | null>(null);
  let isSearching = $state(false);
  let showRegistration = $state(false);
  let showWaiver = $state(false);

  // Demo mode state
  let hasData = $state(false);
  let isLoadingDemo = $state(false);
  let demoMessage = $state('');

  // Check for existing data on mount
  $effect(() => {
    checkDemoData();
  });

  async function checkDemoData() {
    hasData = await app.hasDemoData();
  }

  // Registration form
  let regCollegeId = $state('');
  let regFirstName = $state('');
  let regLastName = $state('');
  let regEmail = $state('');
  let regPhone = $state('');
  let regError = $state('');
  let isRegistering = $state(false);

  // Waiver
  let waiverAgreed = $state(false);
  let isSigningWaiver = $state(false);

  const WAIVER_VERSION = '1.0';
  const WAIVER_TEXT = `
GEAR ROOM LIABILITY WAIVER AND RELEASE

By signing this waiver, I acknowledge that I am voluntarily participating in outdoor activities using equipment provided by the Gear Room. I understand that these activities involve inherent risks including, but not limited to, injury, illness, or death.

I agree to:
1. Inspect all equipment before use and report any damage or concerns
2. Use equipment only for its intended purpose
3. Return all equipment by the due date in clean condition
4. Pay for any lost, stolen, or damaged equipment
5. Follow all safety guidelines and instructions provided

I hereby release and hold harmless the Gear Room, its staff, and affiliated organizations from any claims, damages, or liability arising from my use of the equipment.

I confirm that I am at least 18 years old and legally able to enter into this agreement.
  `.trim();

  async function handleSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    isSearching = true;
    try {
      // First try looking up by college ID
      const byId = await app.lookupMemberByCollegeId(searchQuery.trim());
      if (byId) {
        searchResults = [byId];
      } else {
        // Fall back to search
        searchResults = await app.searchMembers(searchQuery.trim());
      }
    } finally {
      isSearching = false;
    }
  }

  async function selectMember(member: Member) {
    selectedMember = member;
    searchResults = [];
    searchQuery = '';

    // Check eligibility
    eligibility = await app.getCheckoutEligibility(member.id);

    // If waiver not valid, show waiver signing
    if (!member.hasValidWaiver()) {
      showWaiver = true;
    }
  }

  function clearMember() {
    selectedMember = null;
    eligibility = null;
    showWaiver = false;
  }

  async function handleRegister() {
    regError = '';
    isRegistering = true;

    try {
      const result = await app.registerMember({
        collegeId: regCollegeId,
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        phone: regPhone || undefined
      });

      if (result.ok) {
        // Registration successful - select the new member
        showRegistration = false;
        await selectMember(result.value);
        // Clear form
        regCollegeId = '';
        regFirstName = '';
        regLastName = '';
        regEmail = '';
        regPhone = '';
      } else {
        // Handle error
        const error = result.error;
        if (error.type === 'college_id_already_exists') {
          regError = 'This college ID is already registered.';
        } else if (error.type === 'email_already_exists') {
          regError = 'This email is already registered.';
        } else if (error.type === 'invalid_college_id') {
          regError = 'Invalid college ID format.';
        } else if (error.type === 'invalid_email') {
          regError = 'Invalid email format.';
        } else if (error.type === 'empty_first_name') {
          regError = 'First name is required.';
        } else if (error.type === 'empty_last_name') {
          regError = 'Last name is required.';
        }
      }
    } finally {
      isRegistering = false;
    }
  }

  async function handleSignWaiver() {
    if (!selectedMember || !waiverAgreed) return;

    isSigningWaiver = true;
    try {
      const result = await app.signWaiver(selectedMember.id, WAIVER_VERSION);
      if (result.ok) {
        selectedMember = result.value;
        eligibility = await app.getCheckoutEligibility(selectedMember.id);
        showWaiver = false;
        waiverAgreed = false;
      }
    } finally {
      isSigningWaiver = false;
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function loadDemoData() {
    isLoadingDemo = true;
    demoMessage = '';
    try {
      const result = await app.seedDemoData();
      demoMessage = `Loaded ${result.memberCount} members, ${result.gearTypeCount} gear types, ${result.itemCount} items, and ${result.checkoutCount} active checkouts.`;
      hasData = true;
      // Clear any selected member since data was reset
      selectedMember = null;
      eligibility = null;
      searchResults = [];
    } catch (e) {
      demoMessage = 'Failed to load demo data.';
    } finally {
      isLoadingDemo = false;
    }
  }

  async function clearData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    isLoadingDemo = true;
    demoMessage = '';
    try {
      await app.clearAllData();
      demoMessage = 'All data cleared.';
      hasData = false;
      selectedMember = null;
      eligibility = null;
      searchResults = [];
    } catch (e) {
      demoMessage = 'Failed to clear data.';
    } finally {
      isLoadingDemo = false;
    }
  }
</script>

<div class="max-w-5xl mx-auto p-6">
  <header class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Member Lookup</h1>
    <p class="text-gray-500 text-sm mt-1">Tap your college ID or search to get started</p>
  </header>

  <main class="space-y-6">
    {#if !selectedMember && !showRegistration}
      <!-- Member Lookup -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex gap-4">
          <input
            type="text"
            bind:value={searchQuery}
            onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter college ID or name..."
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onclick={handleSearch}
            disabled={isSearching}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {#if searchResults.length > 0}
          <div class="mt-4 border rounded-lg divide-y">
            {#each searchResults as member}
              <button
                onclick={() => selectMember(member)}
                class="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <div class="font-medium">{member.fullName}</div>
                  <div class="text-sm text-gray-500">{member.collegeId.value}</div>
                </div>
                <div class="text-sm">
                  {#if member.membershipStatus === 'ACTIVE'}
                    <span class="text-green-600">Active</span>
                  {:else}
                    <span class="text-red-600">{member.membershipStatus}</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}

        <div class="mt-4 text-center">
          <button
            onclick={() => (showRegistration = true)}
            class="text-blue-600 hover:underline text-sm"
          >
            Register a new member
          </button>
        </div>
      </div>
    {/if}

    {#if showRegistration && !selectedMember}
      <!-- Registration Form -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold">Register New Member</h2>
          <button onclick={() => (showRegistration = false)} class="text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>

        {#if regError}
          <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{regError}</div>
        {/if}

        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
          class="space-y-4"
        >
          <div>
            <label for="collegeId" class="block text-sm font-medium text-gray-700 mb-1">
              College ID
            </label>
            <input
              id="collegeId"
              type="text"
              bind:value={regCollegeId}
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                bind:value={regFirstName}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                bind:value={regLastName}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              bind:value={regEmail}
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              bind:value={regPhone}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRegistering ? 'Registering...' : 'Register Member'}
          </button>
        </form>
      </div>
    {/if}

    {#if selectedMember}
      <!-- Member Selected -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-2xl font-bold">{selectedMember.fullName}</h2>
            <p class="text-gray-500">{selectedMember.collegeId.value}</p>
          </div>
          <button onclick={clearMember} class="text-gray-500 hover:text-gray-700 text-sm">
            Change
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span class="text-sm text-gray-500">Status</span>
            <div>
              {#if selectedMember.membershipStatus === 'ACTIVE'}
                <span class="text-green-600 font-medium">Active</span>
              {:else}
                <span class="text-red-600 font-medium">{selectedMember.membershipStatus}</span>
              {/if}
            </div>
          </div>
          <div>
            <span class="text-sm text-gray-500">Waiver</span>
            <div>
              {#if selectedMember.hasValidWaiver()}
                <span class="text-green-600 font-medium">
                  Valid until {formatDate(selectedMember.waiverStatus.expiresAt!)}
                </span>
              {:else if selectedMember.waiverStatus.signed}
                <span class="text-red-600 font-medium">Expired</span>
              {:else}
                <span class="text-amber-600 font-medium">Not signed</span>
              {/if}
            </div>
          </div>
        </div>

        {#if showWaiver}
          <!-- Waiver Signing -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">Sign Waiver</h3>
            <div class="bg-gray-50 p-4 rounded-lg mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
              {WAIVER_TEXT}
            </div>
            <label class="flex items-center gap-2 mb-4">
              <input type="checkbox" bind:checked={waiverAgreed} class="w-5 h-5" />
              <span>I have read and agree to the terms above</span>
            </label>
            <button
              onclick={handleSignWaiver}
              disabled={!waiverAgreed || isSigningWaiver}
              class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSigningWaiver ? 'Signing...' : 'Sign Waiver'}
            </button>
          </div>
        {:else if eligibility}
          <!-- Eligibility Status & Actions -->
          {#if eligibility.eligible}
            <div class="p-4 bg-green-50 text-green-700 rounded-lg mb-6">
              Ready to check out gear
            </div>

            <div class="flex items-center gap-3">
              <a
                href="/checkout?member={selectedMember.id}"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Out Gear
              </a>
              <a
                href="/return?member={selectedMember.id}"
                class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Return Gear
              </a>
              <a
                href="/members/{selectedMember.id}"
                class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View History
              </a>
            </div>
          {:else}
            <div class="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
              <strong>Cannot check out gear:</strong>
              <ul class="mt-2 list-disc list-inside">
                {#each eligibility.reasons as reason}
                  <li>
                    {#if reason.type === 'membership_not_active'}
                      Membership is {reason.status}
                    {:else if reason.type === 'waiver_not_signed'}
                      Waiver has not been signed
                    {:else if reason.type === 'waiver_expired'}
                      Waiver expired on {formatDate(reason.expiredAt)}
                    {:else if reason.type === 'has_overdue_items'}
                      Has {reason.count} overdue item{reason.count === 1 ? '' : 's'}
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>

            <div class="flex items-center gap-3">
              {#if !selectedMember.hasValidWaiver()}
                <button
                  onclick={() => (showWaiver = true)}
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign Waiver
                </button>
              {/if}
              <a
                href="/return?member={selectedMember.id}"
                class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Return Gear
              </a>
              <a
                href="/members/{selectedMember.id}"
                class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View History
              </a>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if !selectedMember && !showRegistration}
      <!-- Quick Actions -->
      <nav class="grid grid-cols-2 gap-3">
        <a href="/checkout" class="border border-gray-200 bg-white text-gray-900 rounded-lg p-4 text-center hover:bg-gray-50 font-medium">
          Check Out Gear
        </a>
        <a href="/return" class="border border-gray-200 bg-white text-gray-900 rounded-lg p-4 text-center hover:bg-gray-50 font-medium">
          Return Gear
        </a>
        <a href="/inventory" class="border border-gray-200 bg-white text-gray-900 rounded-lg p-4 text-center hover:bg-gray-50 font-medium">
          Inventory
        </a>
        <a href="/dashboard" class="border border-gray-200 bg-white text-gray-900 rounded-lg p-4 text-center hover:bg-gray-50 font-medium">
          Dashboard
        </a>
      </nav>
    {/if}

    <!-- Demo Mode Section -->
    <div class="mt-8 pt-8 border-t border-gray-200">
      <div class="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Demo Mode</h2>
        <p class="text-sm text-gray-600 mb-4">
          {#if hasData}
            Sample data is loaded. Try searching for members like "Alex Rivera" or college ID "STU001".
          {:else}
            Load sample data to test the application with pre-populated members, gear, and checkouts.
          {/if}
        </p>

        {#if demoMessage}
          <div class="mb-4 p-3 bg-white rounded-lg text-sm text-gray-700 border border-gray-200">
            {demoMessage}
          </div>
        {/if}

        <div class="flex gap-3">
          <button
            onclick={loadDemoData}
            disabled={isLoadingDemo}
            class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {#if isLoadingDemo}
              Loading...
            {:else if hasData}
              Reset Demo Data
            {:else}
              Load Demo Data
            {/if}
          </button>
          {#if hasData}
            <button
              onclick={clearData}
              disabled={isLoadingDemo}
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Clear All Data
            </button>
          {/if}
        </div>

        {#if hasData}
          <div class="mt-4 text-xs text-gray-500">
            <strong>Sample Members:</strong> Alex Rivera (STU001), Jordan Chen (STU002 - has overdue items),
            Sam Taylor (STU003 - no waiver), Morgan Williams (STU004 - suspended), Casey Johnson (STU005)
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>
