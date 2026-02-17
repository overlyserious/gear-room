import type {
  CheckoutRepository,
  GearItemRepository,
  GearTypeRepository,
  MemberRepository
} from '../ports/repositories.js';
import type { Clock } from '../ports/services.js';
import type { Member } from '../../domain/entities/member.js';
import type { CheckoutItem } from '../../domain/entities/checkout.js';
import type { MemberId } from '../../domain/value-objects/index.js';
import { type GearCategory, type GearCondition, GearCondition as GearConditionEnum } from '../../domain/types.js';

// ============================================================================
// Shared Deps
// ============================================================================

export interface GetMemberHistoryDeps {
  memberRepo: MemberRepository;
  checkoutRepo: CheckoutRepository;
  gearItemRepo: GearItemRepository;
  gearTypeRepo: GearTypeRepository;
  clock: Clock;
}

// ============================================================================
// Condition Severity (for damage detection)
// ============================================================================

const CONDITION_SEVERITY: Record<GearCondition, number> = {
  EXCELLENT: 0,
  GOOD: 1,
  FAIR: 2,
  NEEDS_REPAIR: 3,
  RETIRED: 4
};

// ============================================================================
// Get Member Profile
// ============================================================================

export interface MemberProfile {
  member: Member;
  flags: {
    hasOverdueItems: boolean;
    overdueItemCount: number;
  };
}

export async function getMemberProfile(
  deps: GetMemberHistoryDeps,
  memberId: string
): Promise<MemberProfile | null> {
  const member = await deps.memberRepo.findById(memberId as MemberId);
  if (!member) return null;

  const now = deps.clock.now();
  const activeCheckouts = await deps.checkoutRepo.findActiveByMemberId(memberId as MemberId);

  let overdueItemCount = 0;
  for (const checkout of activeCheckouts) {
    overdueItemCount += checkout.getOverdueItems(now).length;
  }

  return {
    member,
    flags: {
      hasOverdueItems: overdueItemCount > 0,
      overdueItemCount
    }
  };
}

// ============================================================================
// Get Member Open Items
// ============================================================================

export interface OpenItemSummary {
  checkoutId: string;
  gearTypeName: string;
  gearCategory: GearCategory;
  gearItemCode: string | null;
  checkedOutAt: Date;
  dueAt: Date;
  daysOverdue: number;
  isOverdue: boolean;
  conditionAtCheckout: GearCondition | null;
  quantity: number;
  returnedQuantity: number;
}

export async function getMemberOpenItems(
  deps: GetMemberHistoryDeps,
  memberId: string
): Promise<OpenItemSummary[]> {
  const now = deps.clock.now();
  const activeCheckouts = await deps.checkoutRepo.findActiveByMemberId(memberId as MemberId);
  const items: OpenItemSummary[] = [];

  for (const checkout of activeCheckouts) {
    for (const item of checkout.getActiveItems()) {
      let gearTypeName = 'Unknown';
      let gearCategory: GearCategory = 'OTHER';
      let gearItemCode: string | null = null;

      if (item.gearItemId) {
        const gearItem = await deps.gearItemRepo.findById(item.gearItemId);
        if (gearItem) {
          gearItemCode = gearItem.code;
          const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
          if (gearType) {
            gearTypeName = gearType.name;
            gearCategory = gearType.category;
          }
        }
      } else if (item.gearTypeId) {
        const gearType = await deps.gearTypeRepo.findById(item.gearTypeId);
        if (gearType) {
          gearTypeName = gearType.name;
          gearCategory = gearType.category;
        }
      }

      const daysOverdue = item.dueAt < now
        ? Math.floor((now.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      items.push({
        checkoutId: checkout.id,
        gearTypeName,
        gearCategory,
        gearItemCode,
        checkedOutAt: item.checkedOutAt,
        dueAt: item.dueAt,
        daysOverdue,
        isOverdue: daysOverdue > 0,
        conditionAtCheckout: item.conditionAtCheckout,
        quantity: item.quantity,
        returnedQuantity: item.returnedQuantity
      });
    }
  }

  // Sort overdue items first, then by due date ascending
  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });

  return items;
}

// ============================================================================
// Get Member Behavior Summary
// ============================================================================

export interface BehaviorSummary {
  lateReturnsLast12Months: number;
  longestOverdueDays: number;
  damageIncidents: number;
  lastReturnDate: Date | null;
  totalCheckouts: number;
  totalItemsCheckedOut: number;
}

export async function getMemberBehaviorSummary(
  deps: GetMemberHistoryDeps,
  memberId: string
): Promise<BehaviorSummary> {
  const now = deps.clock.now();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const allCheckouts = await deps.checkoutRepo.findByMemberId(memberId as MemberId);

  let lateReturnsLast12Months = 0;
  let longestOverdueDays = 0;
  let damageIncidents = 0;
  let lastReturnDate: Date | null = null;
  let totalItemsCheckedOut = 0;

  for (const checkout of allCheckouts) {
    for (const item of checkout.items) {
      totalItemsCheckedOut += item.quantity;

      if (item.returnedAt && item.returnedAt > item.dueAt) {
        const daysLate = Math.floor(
          (item.returnedAt.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLate >= 1) {
          if (item.returnedAt >= twelveMonthsAgo) {
            lateReturnsLast12Months++;
          }
          if (daysLate > longestOverdueDays) {
            longestOverdueDays = daysLate;
          }
        }
      }

      if (
        item.conditionAtCheckout &&
        item.conditionAtReturn &&
        CONDITION_SEVERITY[item.conditionAtReturn] > CONDITION_SEVERITY[item.conditionAtCheckout]
      ) {
        damageIncidents++;
      }

      if (item.returnedAt) {
        if (!lastReturnDate || item.returnedAt > lastReturnDate) {
          lastReturnDate = item.returnedAt;
        }
      }
    }
  }

  return {
    lateReturnsLast12Months,
    longestOverdueDays,
    damageIncidents,
    lastReturnDate,
    totalCheckouts: allCheckouts.length,
    totalItemsCheckedOut
  };
}

// ============================================================================
// Get Member Activity Timeline
// ============================================================================

export type TimelineEventType = 'checkout' | 'return';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  occurredAt: Date;
  description: string;
  checkoutId: string;
  itemDescriptions: string[];
  daysLate: number | null;
}

export async function getMemberActivityTimeline(
  deps: GetMemberHistoryDeps,
  memberId: string,
  limit: number = 50
): Promise<TimelineEvent[]> {
  const allCheckouts = await deps.checkoutRepo.findByMemberId(memberId as MemberId);
  const events: TimelineEvent[] = [];

  for (const checkout of allCheckouts) {
    // Build item descriptions for checkout event
    const checkoutItemDescs: string[] = [];

    for (const item of checkout.items) {
      const desc = await resolveItemDescription(deps, item);
      checkoutItemDescs.push(desc);
    }

    // Checkout event
    events.push({
      id: `${checkout.id}-checkout`,
      type: 'checkout',
      occurredAt: checkout.createdAt,
      description: `Checked out ${checkoutItemDescs.join(', ')}`,
      checkoutId: checkout.id,
      itemDescriptions: checkoutItemDescs,
      daysLate: null
    });

    // Return events (one per returned item)
    for (let i = 0; i < checkout.items.length; i++) {
      const item = checkout.items[i];
      if (!item.returnedAt) continue;

      const desc = await resolveItemDescription(deps, item);
      const daysLate = item.returnedAt > item.dueAt
        ? Math.floor((item.returnedAt.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let returnDesc = `Returned ${desc}`;
      if (daysLate >= 1) {
        returnDesc += ` (${daysLate} day${daysLate === 1 ? '' : 's'} late)`;
      }

      events.push({
        id: `${checkout.id}-return-${i}`,
        type: 'return',
        occurredAt: item.returnedAt,
        description: returnDesc,
        checkoutId: checkout.id,
        itemDescriptions: [desc],
        daysLate: daysLate >= 1 ? daysLate : null
      });
    }
  }

  // Sort reverse-chronological
  events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return events.slice(0, limit);
}

async function resolveItemDescription(
  deps: Pick<GetMemberHistoryDeps, 'gearItemRepo' | 'gearTypeRepo'>,
  item: CheckoutItem
): Promise<string> {
  if (item.gearItemId) {
    const gearItem = await deps.gearItemRepo.findById(item.gearItemId);
    if (gearItem) {
      const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
      return gearType ? `${gearType.name} (${gearItem.code})` : gearItem.code;
    }
    return 'Unknown item';
  } else if (item.gearTypeId) {
    const gearType = await deps.gearTypeRepo.findById(item.gearTypeId);
    const qty = item.quantity;
    return gearType ? `${gearType.name} x${qty}` : `Unknown x${qty}`;
  }
  return 'Unknown';
}
