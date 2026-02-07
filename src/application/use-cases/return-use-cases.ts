import { type Result, ok, err } from '../result.js';
import type {
  CheckoutRepository,
  GearItemRepository,
  GearTypeRepository,
  MemberRepository
} from '../ports/repositories.js';
import type { IdGenerator, Clock, EventPublisher } from '../ports/services.js';
import type { Checkout } from '../../domain/entities/checkout.js';
import type { GearItem } from '../../domain/entities/gear-item.js';
import type { GearType } from '../../domain/entities/gear-type.js';
import type { Member } from '../../domain/entities/member.js';
import type { GearItemId, MemberId } from '../../domain/value-objects/index.js';
import { GearCondition, CheckoutStatus } from '../../domain/types.js';

// ============================================================================
// Return Individual Item
// ============================================================================

export type ReturnItemError =
  | { type: 'item_not_found'; code: string }
  | { type: 'item_not_checked_out'; code: string }
  | { type: 'checkout_not_found' };

export interface ReturnItemDeps {
  gearItemRepo: GearItemRepository;
  checkoutRepo: CheckoutRepository;
  gearTypeRepo: GearTypeRepository;
  memberRepo: MemberRepository;
  clock: Clock;
  eventPublisher: EventPublisher;
  idGenerator: IdGenerator;
}

export interface ReturnItemInput {
  itemCode: string;
  condition: GearCondition;
  notes?: string;
}

export interface ReturnItemResult {
  gearItem: GearItem;
  gearType: GearType;
  checkout: Checkout;
  member: Member;
  checkoutComplete: boolean;
}

/**
 * Quick return for an individual item by its code.
 * Finds the active checkout containing this item and processes the return.
 */
export async function returnItemByCode(
  deps: ReturnItemDeps,
  input: ReturnItemInput
): Promise<Result<ReturnItemResult, ReturnItemError>> {
  // Find the gear item
  const gearItem = await deps.gearItemRepo.findByCode(input.itemCode);
  if (!gearItem) {
    return err({ type: 'item_not_found', code: input.itemCode });
  }

  if (!gearItem.isCheckedOut()) {
    return err({ type: 'item_not_checked_out', code: input.itemCode });
  }

  // Find the gear type
  const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
  if (!gearType) {
    return err({ type: 'item_not_found', code: input.itemCode });
  }

  // Find the active checkout containing this item
  const allActiveCheckouts = await deps.checkoutRepo.findAll({
    status: [CheckoutStatus.ACTIVE, CheckoutStatus.PARTIALLY_RETURNED]
  });

  const checkout = allActiveCheckouts.find(c =>
    c.items.some(i => i.gearItemId === gearItem.id && i.returnedAt === null)
  );

  if (!checkout) {
    return err({ type: 'checkout_not_found' });
  }

  // Process the return on the checkout
  const returnResult = checkout.returnItem(
    gearItem.id,
    input.condition,
    input.notes,
    { clock: deps.clock }
  );

  if (!returnResult.ok) {
    return err({ type: 'checkout_not_found' });
  }

  const updatedCheckout = returnResult.value;

  // Update the gear item
  const itemReturnResult = gearItem.markReturned(input.condition, { clock: deps.clock });
  if (!itemReturnResult.ok) {
    return err({ type: 'item_not_checked_out', code: input.itemCode });
  }

  const updatedItem = itemReturnResult.value;

  // Persist changes
  await deps.checkoutRepo.save(updatedCheckout);
  await deps.gearItemRepo.save(updatedItem);

  // Get member for result
  const member = await deps.memberRepo.findById(checkout.memberId);

  // Publish event
  await deps.eventPublisher.publish({
    id: deps.idGenerator.generate(),
    type: 'ItemReturned',
    aggregateId: checkout.id,
    occurredAt: deps.clock.now(),
    payload: {
      checkoutId: checkout.id,
      gearItemId: gearItem.id,
      itemCode: input.itemCode,
      condition: input.condition,
      checkoutComplete: updatedCheckout.status === CheckoutStatus.COMPLETED
    }
  });

  return ok({
    gearItem: updatedItem,
    gearType,
    checkout: updatedCheckout,
    member: member!,
    checkoutComplete: updatedCheckout.status === CheckoutStatus.COMPLETED
  });
}

// ============================================================================
// Return Multiple Items for a Checkout
// ============================================================================

export type ReturnItemsError =
  | { type: 'checkout_not_found'; checkoutId: string }
  | { type: 'checkout_already_completed' }
  | { type: 'item_not_in_checkout'; itemId: string }
  | { type: 'item_already_returned'; itemId: string };

export interface ReturnItemsDeps {
  checkoutRepo: CheckoutRepository;
  gearItemRepo: GearItemRepository;
  memberRepo: MemberRepository;
  clock: Clock;
  eventPublisher: EventPublisher;
  idGenerator: IdGenerator;
}

export interface ReturnItemsInput {
  checkoutId: string;
  returns: Array<{
    // For individual items
    gearItemId?: string;
    condition?: GearCondition;
    // For bulk items
    gearTypeId?: string;
    quantity?: number;
    // Notes for any return
    notes?: string;
  }>;
}

export interface ReturnItemsResult {
  checkout: Checkout;
  member: Member;
  checkoutComplete: boolean;
}

/**
 * Process multiple returns for a single checkout.
 */
export async function returnItems(
  deps: ReturnItemsDeps,
  input: ReturnItemsInput
): Promise<Result<ReturnItemsResult, ReturnItemsError>> {
  const initialCheckout = await deps.checkoutRepo.findById(input.checkoutId as any);
  if (!initialCheckout) {
    return err({ type: 'checkout_not_found', checkoutId: input.checkoutId });
  }

  if (initialCheckout.status === CheckoutStatus.COMPLETED) {
    return err({ type: 'checkout_already_completed' });
  }

  const now = deps.clock.now();
  const gearItemsToUpdate: GearItem[] = [];
  let currentCheckout: Checkout = initialCheckout;

  for (const returnReq of input.returns) {
    if (returnReq.gearItemId) {
      // Individual item return
      const returnResult = currentCheckout.returnItem(
        returnReq.gearItemId,
        returnReq.condition ?? GearCondition.GOOD,
        returnReq.notes,
        { clock: deps.clock }
      );

      if (!returnResult.ok) {
        if (returnResult.error.type === 'item_not_found') {
          return err({ type: 'item_not_in_checkout', itemId: returnReq.gearItemId });
        }
        if (returnResult.error.type === 'item_already_returned') {
          return err({ type: 'item_already_returned', itemId: returnReq.gearItemId });
        }
        return err({ type: 'checkout_already_completed' });
      }

      currentCheckout = returnResult.value;

      // Update the gear item
      const gearItem = await deps.gearItemRepo.findById(returnReq.gearItemId as GearItemId);
      if (gearItem) {
        const itemResult = gearItem.markReturned(
          returnReq.condition ?? GearCondition.GOOD,
          { clock: deps.clock }
        );
        if (itemResult.ok) {
          gearItemsToUpdate.push(itemResult.value);
        }
      }
    } else if (returnReq.gearTypeId && returnReq.quantity) {
      // Bulk item return
      const returnResult = currentCheckout.returnBulkItem(
        returnReq.gearTypeId,
        returnReq.quantity,
        returnReq.notes,
        { clock: deps.clock }
      );

      if (!returnResult.ok) {
        return err({ type: 'item_not_in_checkout', itemId: returnReq.gearTypeId });
      }

      currentCheckout = returnResult.value;
    }
  }

  // Persist changes
  await deps.checkoutRepo.save(currentCheckout);
  for (const item of gearItemsToUpdate) {
    await deps.gearItemRepo.save(item);
  }

  const member = await deps.memberRepo.findById(currentCheckout.memberId);

  // Publish event
  await deps.eventPublisher.publish({
    id: deps.idGenerator.generate(),
    type: 'ItemsReturned',
    aggregateId: currentCheckout.id,
    occurredAt: now,
    payload: {
      checkoutId: currentCheckout.id,
      returnCount: input.returns.length,
      checkoutComplete: currentCheckout.status === CheckoutStatus.COMPLETED
    }
  });

  return ok({
    checkout: currentCheckout,
    member: member!,
    checkoutComplete: currentCheckout.status === CheckoutStatus.COMPLETED
  });
}

// ============================================================================
// Get Member's Items to Return
// ============================================================================

export interface GetItemsToReturnDeps {
  checkoutRepo: CheckoutRepository;
  gearItemRepo: GearItemRepository;
  gearTypeRepo: GearTypeRepository;
  memberRepo: MemberRepository;
  clock: Clock;
}

export interface ItemToReturn {
  checkoutId: string;
  gearType: GearType;
  gearItem?: GearItem;
  quantity: number;
  returnedQuantity: number;
  dueAt: Date;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface MemberItemsToReturn {
  member: Member;
  items: ItemToReturn[];
  totalOverdue: number;
}

/**
 * Get all items a member needs to return.
 */
export async function getMemberItemsToReturn(
  deps: GetItemsToReturnDeps,
  memberId: string
): Promise<MemberItemsToReturn | null> {
  const member = await deps.memberRepo.findById(memberId as MemberId);
  if (!member) {
    return null;
  }

  const activeCheckouts = await deps.checkoutRepo.findActiveByMemberId(memberId as MemberId);
  const now = deps.clock.now();
  const items: ItemToReturn[] = [];
  let totalOverdue = 0;

  for (const checkout of activeCheckouts) {
    for (const item of checkout.getActiveItems()) {
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
        const isOverdue = item.dueAt < now;
        const daysOverdue = isOverdue
          ? Math.floor((now.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        if (isOverdue) {
          totalOverdue += item.quantity - item.returnedQuantity;
        }

        items.push({
          checkoutId: checkout.id,
          gearType,
          gearItem,
          quantity: item.quantity,
          returnedQuantity: item.returnedQuantity,
          dueAt: item.dueAt,
          isOverdue,
          daysOverdue
        });
      }
    }
  }

  return { member, items, totalOverdue };
}

// ============================================================================
// Lookup Item by Code
// ============================================================================

export interface LookupItemDeps {
  gearItemRepo: GearItemRepository;
  gearTypeRepo: GearTypeRepository;
  checkoutRepo: CheckoutRepository;
  memberRepo: MemberRepository;
}

export interface ItemLookupResult {
  gearItem: GearItem;
  gearType: GearType;
  checkout?: Checkout;
  member?: Member;
}

/**
 * Look up a gear item by its code with full context.
 */
export async function lookupItemByCode(
  deps: LookupItemDeps,
  code: string
): Promise<ItemLookupResult | null> {
  const gearItem = await deps.gearItemRepo.findByCode(code.toUpperCase());
  if (!gearItem) {
    return null;
  }

  const gearType = await deps.gearTypeRepo.findById(gearItem.gearTypeId);
  if (!gearType) {
    return null;
  }

  let checkout: Checkout | undefined;
  let member: Member | undefined;

  if (gearItem.isCheckedOut()) {
    // Find the active checkout
    const allActive = await deps.checkoutRepo.findAll({
      status: [CheckoutStatus.ACTIVE, CheckoutStatus.PARTIALLY_RETURNED]
    });

    checkout = allActive.find(c =>
      c.items.some(i => i.gearItemId === gearItem.id && i.returnedAt === null)
    );

    if (checkout) {
      member = (await deps.memberRepo.findById(checkout.memberId)) ?? undefined;
    }
  }

  return { gearItem, gearType, checkout, member };
}
