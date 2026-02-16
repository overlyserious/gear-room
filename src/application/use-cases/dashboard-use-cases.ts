import type {
  CheckoutRepository,
  GearItemRepository,
  GearTypeRepository,
  MemberRepository
} from '../ports/repositories.js';
import type { Clock } from '../ports/services.js';
import type { GearCategory, TrackingMode } from '../../domain/types.js';
import { GearStatus } from '../../domain/types.js';

// ============================================================================
// Get Overdue Checkouts
// ============================================================================

export interface GetOverdueCheckoutsDeps {
  checkoutRepo: CheckoutRepository;
  memberRepo: MemberRepository;
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
  clock: Clock;
}

export interface OverdueCheckoutItem {
  checkoutId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string | null;
  collegeId: string;
  itemDescription: string;
  dueAt: Date;
  daysOverdue: number;
}

/**
 * Get all overdue checkout items with member contact info and gear details.
 * Returns a flat list sorted by most overdue first.
 */
export async function getOverdueCheckouts(
  deps: GetOverdueCheckoutsDeps
): Promise<OverdueCheckoutItem[]> {
  const now = deps.clock.now();
  const overdueCheckouts = await deps.checkoutRepo.findOverdue(now);
  const items: OverdueCheckoutItem[] = [];

  for (const checkout of overdueCheckouts) {
    const member = await deps.memberRepo.findById(checkout.memberId);
    if (!member) continue;

    for (const item of checkout.getOverdueItems(now)) {
      let itemDescription = '';

      if (item.gearItemId) {
        const gearItem = await deps.gearItemRepo.findById(item.gearItemId);
        if (gearItem) {
          const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
          itemDescription = gearType
            ? `${gearType.name} (${gearItem.code})`
            : gearItem.code;
        }
      } else if (item.gearTypeId) {
        const gearType = await deps.gearTypeRepo.findById(item.gearTypeId);
        const remaining = item.quantity - item.returnedQuantity;
        itemDescription = gearType
          ? `${gearType.name} x${remaining}`
          : `Unknown x${remaining}`;
      }

      const daysOverdue = Math.floor(
        (now.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      items.push({
        checkoutId: checkout.id,
        memberName: member.fullName,
        memberEmail: member.email.value,
        memberPhone: member.phone,
        collegeId: member.collegeId.value,
        itemDescription,
        dueAt: item.dueAt,
        daysOverdue
      });
    }
  }

  items.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return items;
}

// ============================================================================
// Get Inventory Status
// ============================================================================

export interface GetInventoryStatusDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
}

export interface CategoryInventoryStatus {
  category: GearCategory;
  categoryLabel: string;
  available: number;
  checkedOut: number;
  maintenance: number;
  retired: number;
  total: number;
}

export interface InventoryStatusSummary {
  categories: CategoryInventoryStatus[];
  totals: {
    available: number;
    checkedOut: number;
    maintenance: number;
    retired: number;
    total: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  SLEEPING_BAG: 'Sleeping Bags',
  TENT: 'Tents',
  BACKPACK: 'Backpacks',
  STOVE: 'Stoves',
  BIKE: 'Bikes',
  PAD: 'Pads',
  POLES: 'Poles',
  COOKWARE: 'Cookware',
  CLIMBING: 'Climbing',
  WATER: 'Water',
  OTHER: 'Other'
};

/**
 * Get inventory counts grouped by category and status.
 */
export async function getInventoryStatus(
  deps: GetInventoryStatusDeps
): Promise<InventoryStatusSummary> {
  const gearTypes = await deps.gearTypeRepo.findAll();
  const allItems = await deps.gearItemRepo.findAll();

  // Build a map of gearTypeId → category
  const typeToCategory = new Map<string, GearCategory>();
  const typeToTrackingMode = new Map<string, TrackingMode>();
  for (const gt of gearTypes) {
    typeToCategory.set(gt.id, gt.category);
    typeToTrackingMode.set(gt.id, gt.trackingMode);
  }

  // Accumulate counts per category
  const categoryCounts = new Map<
    GearCategory,
    { available: number; checkedOut: number; maintenance: number; retired: number }
  >();

  function ensureCategory(category: GearCategory) {
    if (!categoryCounts.has(category)) {
      categoryCounts.set(category, { available: 0, checkedOut: 0, maintenance: 0, retired: 0 });
    }
    return categoryCounts.get(category)!;
  }

  // Count individual-tracked items by status
  for (const item of allItems) {
    const category = typeToCategory.get(item.gearTypeId);
    if (!category) continue;

    const counts = ensureCategory(category);
    switch (item.status) {
      case GearStatus.AVAILABLE:
        counts.available++;
        break;
      case GearStatus.CHECKED_OUT:
        counts.checkedOut++;
        break;
      case GearStatus.MAINTENANCE:
        counts.maintenance++;
        break;
      case GearStatus.RETIRED:
        counts.retired++;
        break;
    }
  }

  // Add bulk-tracked gear types (total quantity counted as available)
  for (const gt of gearTypes) {
    if (gt.trackingMode === 'BULK' && gt.totalQuantity > 0) {
      const counts = ensureCategory(gt.category);
      counts.available += gt.totalQuantity;
    }
  }

  // Build sorted result
  const categories: CategoryInventoryStatus[] = [];
  const totals = { available: 0, checkedOut: 0, maintenance: 0, retired: 0, total: 0 };

  for (const [category, counts] of categoryCounts) {
    const total = counts.available + counts.checkedOut + counts.maintenance + counts.retired;
    categories.push({
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? category,
      available: counts.available,
      checkedOut: counts.checkedOut,
      maintenance: counts.maintenance,
      retired: counts.retired,
      total
    });

    totals.available += counts.available;
    totals.checkedOut += counts.checkedOut;
    totals.maintenance += counts.maintenance;
    totals.retired += counts.retired;
    totals.total += total;
  }

  categories.sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));

  return { categories, totals };
}
