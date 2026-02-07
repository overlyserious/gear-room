import { type Result, ok, err } from '../result.js';
import type {
  MemberRepository,
  GearTypeRepository,
  GearItemRepository,
  CheckoutRepository
} from '../ports/repositories.js';
import type { IdGenerator, Clock, EventPublisher } from '../ports/services.js';
import { Checkout, type CheckoutItemInput } from '../../domain/entities/checkout.js';
import type { GearItem } from '../../domain/entities/gear-item.js';
import type { GearType } from '../../domain/entities/gear-type.js';
import type { Member } from '../../domain/entities/member.js';
import type { MemberId, GearItemId, GearTypeId } from '../../domain/value-objects/index.js';
import { GearCondition, TrackingMode } from '../../domain/types.js';

// ============================================================================
// Create Checkout
// ============================================================================

export type CreateCheckoutError =
  | { type: 'member_not_found'; memberId: string }
  | { type: 'member_not_eligible'; reasons: string[] }
  | { type: 'no_items' }
  | { type: 'gear_item_not_found'; code: string }
  | { type: 'gear_item_not_available'; code: string; status: string }
  | { type: 'gear_type_not_found'; gearTypeId: string }
  | { type: 'insufficient_quantity'; gearTypeId: string; requested: number; available: number };

export interface CreateCheckoutDeps {
  memberRepo: MemberRepository;
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
  checkoutRepo: CheckoutRepository;
  idGenerator: IdGenerator;
  clock: Clock;
  eventPublisher: EventPublisher;
}

export interface CheckoutItemRequest {
  // For individual items, provide the item code
  itemCode?: string;
  // For bulk items, provide the gear type ID and quantity
  gearTypeId?: string;
  quantity?: number;
}

export interface CreateCheckoutInput {
  memberId: string;
  staffMemberId: string;
  items: CheckoutItemRequest[];
  notes?: string;
}

export interface CreateCheckoutResult {
  checkout: Checkout;
  member: Member;
  itemDetails: Array<{
    gearType: GearType;
    gearItem?: GearItem;
    quantity: number;
    dueAt: Date;
  }>;
}

/**
 * Create a checkout for a member.
 * Validates member eligibility and item availability.
 */
export async function createCheckout(
  deps: CreateCheckoutDeps,
  input: CreateCheckoutInput
): Promise<Result<CreateCheckoutResult, CreateCheckoutError>> {
  // Validate member
  const member = await deps.memberRepo.findById(input.memberId as MemberId);
  if (!member) {
    return err({ type: 'member_not_found', memberId: input.memberId });
  }

  const now = deps.clock.now();
  if (!member.canCheckout(now)) {
    const reasons: string[] = [];
    if (member.membershipStatus !== 'ACTIVE') {
      reasons.push(`Membership status: ${member.membershipStatus}`);
    }
    if (!member.hasValidWaiver(now)) {
      reasons.push('Waiver not valid');
    }
    return err({ type: 'member_not_eligible', reasons });
  }

  if (input.items.length === 0) {
    return err({ type: 'no_items' });
  }

  // Resolve and validate all items
  const checkoutItems: Array<{
    input: CheckoutItemInput;
    dueAt: Date;
    conditionAtCheckout?: GearCondition;
  }> = [];

  const itemDetails: CreateCheckoutResult['itemDetails'] = [];
  const gearItemsToUpdate: GearItem[] = [];

  for (const itemReq of input.items) {
    if (itemReq.itemCode) {
      // Individual item by code
      const gearItem = await deps.gearItemRepo.findByCode(itemReq.itemCode);
      if (!gearItem) {
        return err({ type: 'gear_item_not_found', code: itemReq.itemCode });
      }
      if (!gearItem.canCheckout()) {
        return err({
          type: 'gear_item_not_available',
          code: itemReq.itemCode,
          status: gearItem.status
        });
      }

      const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
      if (!gearType) {
        return err({ type: 'gear_type_not_found', gearTypeId: gearItem.gearTypeId });
      }

      const dueAt = new Date(now);
      dueAt.setDate(dueAt.getDate() + gearType.checkoutDurationDays);

      checkoutItems.push({
        input: { type: 'individual', gearItemId: gearItem.id },
        dueAt,
        conditionAtCheckout: gearItem.condition
      });

      itemDetails.push({
        gearType,
        gearItem,
        quantity: 1,
        dueAt
      });

      // Mark item as checked out
      const checkedOutResult = gearItem.markCheckedOut({ clock: deps.clock });
      if (checkedOutResult.ok) {
        gearItemsToUpdate.push(checkedOutResult.value);
      }
    } else if (itemReq.gearTypeId && itemReq.quantity) {
      // Bulk item
      const gearType = await deps.gearTypeRepo.findById(itemReq.gearTypeId as GearTypeId);
      if (!gearType) {
        return err({ type: 'gear_type_not_found', gearTypeId: itemReq.gearTypeId });
      }

      if (gearType.trackingMode !== TrackingMode.BULK) {
        return err({
          type: 'gear_type_not_found',
          gearTypeId: itemReq.gearTypeId
        });
      }

      // For bulk items, we need to calculate available quantity
      // This would require checking active checkouts - simplified for now
      const available = gearType.totalQuantity;
      if (itemReq.quantity > available) {
        return err({
          type: 'insufficient_quantity',
          gearTypeId: itemReq.gearTypeId,
          requested: itemReq.quantity,
          available
        });
      }

      const dueAt = new Date(now);
      dueAt.setDate(dueAt.getDate() + gearType.checkoutDurationDays);

      checkoutItems.push({
        input: { type: 'bulk', gearTypeId: gearType.id, quantity: itemReq.quantity },
        dueAt
      });

      itemDetails.push({
        gearType,
        quantity: itemReq.quantity,
        dueAt
      });
    }
  }

  // Create the checkout
  const checkoutResult = Checkout.create(
    {
      memberId: input.memberId,
      staffMemberId: input.staffMemberId,
      items: checkoutItems,
      notes: input.notes
    },
    { idGenerator: deps.idGenerator, clock: deps.clock }
  );

  if (!checkoutResult.ok) {
    return err({ type: 'no_items' });
  }

  const checkout = checkoutResult.value;

  // Persist everything
  await deps.checkoutRepo.save(checkout);
  for (const item of gearItemsToUpdate) {
    await deps.gearItemRepo.save(item);
  }

  // Publish event
  await deps.eventPublisher.publish({
    id: deps.idGenerator.generate(),
    type: 'CheckoutCreated',
    aggregateId: checkout.id,
    occurredAt: now,
    payload: {
      checkoutId: checkout.id,
      memberId: member.id,
      itemCount: checkout.items.length
    }
  });

  return ok({ checkout, member, itemDetails });
}

// ============================================================================
// Get Active Checkouts for Member
// ============================================================================

export interface GetActiveCheckoutsDeps {
  checkoutRepo: CheckoutRepository;
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
}

export interface ActiveCheckoutSummary {
  checkout: Checkout;
  items: Array<{
    gearType: GearType;
    gearItem?: GearItem;
    quantity: number;
    returnedQuantity: number;
    dueAt: Date;
    isOverdue: boolean;
  }>;
}

/**
 * Get all active checkouts for a member with item details.
 */
export async function getActiveCheckoutsForMember(
  deps: GetActiveCheckoutsDeps,
  memberId: string,
  asOf: Date = new Date()
): Promise<ActiveCheckoutSummary[]> {
  const checkouts = await deps.checkoutRepo.findActiveByMemberId(memberId as MemberId);
  const summaries: ActiveCheckoutSummary[] = [];

  for (const checkout of checkouts) {
    const items: ActiveCheckoutSummary['items'] = [];

    for (const item of checkout.items) {
      let gearType: GearType | null = null;
      let gearItem: GearItem | undefined;

      if (item.gearItemId) {
        gearItem = (await deps.gearItemRepo.findById(item.gearItemId)) ?? undefined;
        if (gearItem) {
          gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
        }
      } else if (item.gearTypeId) {
        gearType = await deps.gearTypeRepo.findById(item.gearTypeId);
      }

      if (gearType) {
        items.push({
          gearType,
          gearItem,
          quantity: item.quantity,
          returnedQuantity: item.returnedQuantity,
          dueAt: item.dueAt,
          isOverdue: item.dueAt < asOf && item.returnedAt === null
        });
      }
    }

    summaries.push({ checkout, items });
  }

  return summaries;
}

// ============================================================================
// Search Available Gear
// ============================================================================

export interface SearchGearDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
}

export interface GearSearchResult {
  gearType: GearType;
  // For INDIVIDUAL tracking: list of available items
  availableItems?: GearItem[];
  // For BULK tracking: available quantity
  availableQuantity?: number;
}

/**
 * Search for available gear by name or category.
 */
export async function searchAvailableGear(
  deps: SearchGearDeps,
  searchTerm?: string,
  category?: string
): Promise<GearSearchResult[]> {
  let gearTypes: GearType[];

  if (searchTerm) {
    gearTypes = await deps.gearTypeRepo.search(searchTerm);
  } else if (category) {
    gearTypes = await deps.gearTypeRepo.findByCategory(category as any);
  } else {
    gearTypes = await deps.gearTypeRepo.findAll();
  }

  const results: GearSearchResult[] = [];

  for (const gearType of gearTypes) {
    if (gearType.trackingMode === TrackingMode.INDIVIDUAL) {
      const items = await deps.gearItemRepo.findByGearTypeId(gearType.id);
      const availableItems = items.filter(i => i.canCheckout());
      results.push({ gearType, availableItems });
    } else {
      // For bulk, we'd need to calculate from active checkouts
      // Simplified: just return total quantity for now
      results.push({ gearType, availableQuantity: gearType.totalQuantity });
    }
  }

  return results;
}
