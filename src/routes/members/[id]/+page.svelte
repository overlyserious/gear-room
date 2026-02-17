<script lang="ts">
  import { page } from '$app/stores';
  import { app } from '$lib/stores/app.js';
  import { MembershipStatus } from '../../../domain/types.js';
  import type { MemberProfile, OpenItemSummary, BehaviorSummary, TimelineEvent } from '../../../application/use-cases/member-history-use-cases.js';
  import MemberOpenItemsTable from '$lib/members/MemberOpenItemsTable.svelte';
  import MemberBehaviorSummaryComponent from '$lib/members/MemberBehaviorSummary.svelte';
  import MemberActivityTimeline from '$lib/members/MemberActivityTimeline.svelte';

  const memberId = $derived($page.params.id ?? '');

  let profile = $state<MemberProfile | null>(null);
  let openItems = $state<OpenItemSummary[]>([]);
  let summary = $state<BehaviorSummary | null>(null);
  let timeline = $state<TimelineEvent[]>([]);
  let loading = $state(true);
  let notFound = $state(false);

  $effect(() => {
    if (memberId) loadAll(memberId);
  });

  async function loadAll(id: string) {
    loading = true;
    notFound = false;

    const [p, o, s, t] = await Promise.all([
      app.getMemberProfile(id),
      app.getMemberOpenItems(id),
      app.getMemberBehaviorSummary(id),
      app.getMemberActivityTimeline(id, 50)
    ]);

    if (!p) {
      notFound = true;
      loading = false;
      return;
    }

    profile = p;
    openItems = o;
    summary = s;
    timeline = t;
    loading = false;
  }

  const statusConfig: Record<string, { label: string; classes: string }> = {
    [MembershipStatus.ACTIVE]: { label: 'Active', classes: 'bg-green-100 text-green-800' },
    [MembershipStatus.SUSPENDED]: { label: 'Suspended', classes: 'bg-red-100 text-red-800' },
    [MembershipStatus.EXPIRED]: { label: 'Expired', classes: 'bg-gray-100 text-gray-600' }
  };
</script>

<div class="max-w-5xl mx-auto p-6">
  <!-- Sticky Header -->
  <header class="sticky top-0 bg-white border-b z-10 -mx-6 px-6 py-4 mb-6">
    <div class="flex items-center justify-between">
      <div>
        {#if loading}
          <div class="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
        {:else if profile}
          <h1 class="text-2xl font-bold text-gray-900">{profile.member.fullName}</h1>
          <div class="flex items-center gap-3 mt-1 text-sm">
            <span class="text-gray-500">{profile.member.collegeId.value}</span>
            <span class="text-gray-300">|</span>
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium {statusConfig[profile.member.membershipStatus].classes}">
              {statusConfig[profile.member.membershipStatus].label}
            </span>
          </div>
        {/if}
      </div>

      {#if profile?.flags.hasOverdueItems}
        <span class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
          {profile.flags.overdueItemCount} Overdue
        </span>
      {/if}
    </div>
  </header>

  {#if loading}
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow p-6 h-32 animate-pulse"></div>
      <div class="bg-white rounded-lg shadow p-6 h-40 animate-pulse"></div>
      <div class="bg-white rounded-lg shadow p-6 h-64 animate-pulse"></div>
    </div>
  {:else if notFound}
    <div class="bg-white rounded-lg shadow p-8 text-center">
      <h2 class="text-xl font-semibold text-gray-700 mb-2">Member Not Found</h2>
      <p class="text-gray-500 mb-4">No member found with this ID.</p>
      <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
    </div>
  {:else if profile && summary}
    <div class="space-y-6">
      <!-- Open Items (highest priority, rendered first) -->
      <MemberOpenItemsTable {openItems} />

      <!-- Behavior Summary -->
      <MemberBehaviorSummaryComponent {summary} />

      <!-- Activity Timeline -->
      <MemberActivityTimeline events={timeline} {memberId} />
    </div>
  {/if}
</div>
