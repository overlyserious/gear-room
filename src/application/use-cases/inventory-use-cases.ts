import { type Result, ok, err } from '../result.js';
import type {
  GearTypeRepository,
  GearItemRepository,
  CheckoutRepository
} from '../ports/repositories.js';
import type { IdGenerator, Clock } from '../ports/services.js';
import { GearType, type CreateGearTypeInput } from '../../domain/entities/gear-type.js';
import { GearItem } from '../../domain/entities/gear-item.js';
import {
  GearCategory,
  GearCondition,
  GearStatus,
  TrackingMode
} from '../../domain/types.js';
import type { GearTypeId } from '../../domain/value-objects/index.js';
import { gearTypeId } from '../../domain/value-objects/index.js';

// ============================================================================
// Create Gear Type
// ============================================================================

export type CreateGearTypeUseCaseError =
  | { type: 'empty_name' }
  | { type: 'bulk_requires_quantity' }
  | { type: 'invalid_quantity'; value: number }
  | { type: 'duplicate_name'; name: string };

export interface CreateGearTypeDeps {
  gearTypeRepo: GearTypeRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export async function createGearType(
  deps: CreateGearTypeDeps,
  input: CreateGearTypeInput
): Promise<Result<GearType, CreateGearTypeUseCaseError>> {
  // Check for duplicate name
  const existing = await deps.gearTypeRepo.findAll();
  const nameNormalized = input.name.trim().toLowerCase();
  if (existing.some((gt) => gt.name.toLowerCase() === nameNormalized)) {
    return err({ type: 'duplicate_name', name: input.name.trim() });
  }

  const result = GearType.create(input, deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearTypeRepo.save(result.value);
  return result;
}

// ============================================================================
// Update Gear Type
// ============================================================================

export type UpdateGearTypeError =
  | { type: 'not_found'; id: string }
  | { type: 'empty_name' };

export interface UpdateGearTypeDeps {
  gearTypeRepo: GearTypeRepository;
  clock: Clock;
}

export interface UpdateGearTypeInput {
  id: string;
  name?: string;
  checkoutDurationDays?: number;
  notes?: string;
}

export async function updateGearType(
  deps: UpdateGearTypeDeps,
  input: UpdateGearTypeInput
): Promise<Result<GearType, UpdateGearTypeError>> {
  const gearType = await deps.gearTypeRepo.findById(gearTypeId(input.id));
  if (!gearType) {
    return err({ type: 'not_found', id: input.id });
  }

  const result = gearType.update(
    {
      name: input.name,
      checkoutDurationDays: input.checkoutDurationDays,
      notes: input.notes
    },
    deps
  );

  if (!result.ok) {
    return result;
  }

  await deps.gearTypeRepo.save(result.value);
  return result;
}

// ============================================================================
// Update Bulk Quantity
// ============================================================================

export type UpdateBulkQuantityError =
  | { type: 'not_found'; id: string }
  | { type: 'not_bulk_tracked' }
  | { type: 'invalid_quantity'; value: number };

export interface UpdateBulkQuantityDeps {
  gearTypeRepo: GearTypeRepository;
  clock: Clock;
}

export async function updateBulkQuantity(
  deps: UpdateBulkQuantityDeps,
  gearTypeId_: string,
  newQuantity: number
): Promise<Result<GearType, UpdateBulkQuantityError>> {
  const gearType = await deps.gearTypeRepo.findById(gearTypeId(gearTypeId_));
  if (!gearType) {
    return err({ type: 'not_found', id: gearTypeId_ });
  }

  const result = gearType.updateQuantity(newQuantity, deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearTypeRepo.save(result.value);
  return result;
}

// ============================================================================
// Delete Gear Type
// ============================================================================

export type DeleteGearTypeError =
  | { type: 'not_found'; id: string }
  | { type: 'has_checked_out_items'; count: number };

export interface DeleteGearTypeDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
}

export async function deleteGearType(
  deps: DeleteGearTypeDeps,
  gearTypeId_: string
): Promise<Result<void, DeleteGearTypeError>> {
  const gearType = await deps.gearTypeRepo.findById(gearTypeId(gearTypeId_));
  if (!gearType) {
    return err({ type: 'not_found', id: gearTypeId_ });
  }

  // Check for checked-out items
  const items = await deps.gearItemRepo.findByGearTypeId(gearTypeId(gearTypeId_));
  const checkedOutItems = items.filter((item) => item.status === GearStatus.CHECKED_OUT);
  if (checkedOutItems.length > 0) {
    return err({ type: 'has_checked_out_items', count: checkedOutItems.length });
  }

  // Cascade delete items then type
  for (const item of items) {
    await deps.gearItemRepo.delete(item.id);
  }
  await deps.gearTypeRepo.delete(gearType.id);

  return ok(undefined);
}

// ============================================================================
// Add Gear Item
// ============================================================================

export type AddGearItemError =
  | { type: 'gear_type_not_found'; id: string }
  | { type: 'not_individual_tracked' }
  | { type: 'duplicate_code'; code: string }
  | { type: 'empty_code' }
  | { type: 'invalid_code_format'; code: string };

export interface AddGearItemDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export async function addGearItem(
  deps: AddGearItemDeps,
  input: { gearTypeId: string; code: string; condition?: GearCondition; notes?: string }
): Promise<Result<GearItem, AddGearItemError>> {
  const gearType = await deps.gearTypeRepo.findById(gearTypeId(input.gearTypeId));
  if (!gearType) {
    return err({ type: 'gear_type_not_found', id: input.gearTypeId });
  }

  if (!gearType.isIndividuallyTracked) {
    return err({ type: 'not_individual_tracked' });
  }

  // Check code uniqueness (globally unique)
  const existingItem = await deps.gearItemRepo.findByCode(input.code.trim().toUpperCase());
  if (existingItem) {
    return err({ type: 'duplicate_code', code: input.code.trim().toUpperCase() });
  }

  const result = GearItem.create(input, deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearItemRepo.save(result.value);
  return result;
}

// ============================================================================
// Update Gear Item
// ============================================================================

export type UpdateGearItemError =
  | { type: 'not_found'; id: string }
  | { type: 'is_checked_out' }
  | { type: 'is_retired' };

export interface UpdateGearItemDeps {
  gearItemRepo: GearItemRepository;
  clock: Clock;
}

export async function updateGearItem(
  deps: UpdateGearItemDeps,
  input: { id: string; condition?: GearCondition; notes?: string }
): Promise<Result<GearItem, UpdateGearItemError>> {
  const item = await deps.gearItemRepo.findById(input.id as any);
  if (!item) {
    return err({ type: 'not_found', id: input.id });
  }

  let current = item;

  // Update condition if provided
  if (input.condition !== undefined) {
    const conditionResult = current.updateCondition(input.condition, deps);
    if (!conditionResult.ok) {
      return conditionResult;
    }
    current = conditionResult.value;
  }

  // Update notes if provided
  if (input.notes !== undefined) {
    current = current.updateNotes(input.notes, deps);
  }

  await deps.gearItemRepo.save(current);
  return ok(current);
}

// ============================================================================
// Send Item to Maintenance
// ============================================================================

export type SendToMaintenanceError =
  | { type: 'not_found'; id: string }
  | { type: 'already_in_maintenance' }
  | { type: 'is_retired' };

export interface SendToMaintenanceDeps {
  gearItemRepo: GearItemRepository;
  clock: Clock;
}

export async function sendItemToMaintenance(
  deps: SendToMaintenanceDeps,
  itemId: string,
  notes?: string
): Promise<Result<GearItem, SendToMaintenanceError>> {
  const item = await deps.gearItemRepo.findById(itemId as any);
  if (!item) {
    return err({ type: 'not_found', id: itemId });
  }

  const result = item.sendToMaintenance(notes, deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearItemRepo.save(result.value);
  return result;
}

// ============================================================================
// Return Item from Maintenance
// ============================================================================

export type ReturnFromMaintenanceError =
  | { type: 'not_found'; id: string }
  | { type: 'not_in_maintenance' };

export interface ReturnFromMaintenanceDeps {
  gearItemRepo: GearItemRepository;
  clock: Clock;
}

export async function returnItemFromMaintenance(
  deps: ReturnFromMaintenanceDeps,
  itemId: string,
  condition: GearCondition
): Promise<Result<GearItem, ReturnFromMaintenanceError>> {
  const item = await deps.gearItemRepo.findById(itemId as any);
  if (!item) {
    return err({ type: 'not_found', id: itemId });
  }

  const result = item.returnFromMaintenance(condition, deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearItemRepo.save(result.value);
  return result;
}

// ============================================================================
// Retire Item
// ============================================================================

export type RetireItemError =
  | { type: 'not_found'; id: string }
  | { type: 'is_checked_out' }
  | { type: 'already_retired' };

export interface RetireItemDeps {
  gearItemRepo: GearItemRepository;
  clock: Clock;
}

export async function retireItem(
  deps: RetireItemDeps,
  itemId: string
): Promise<Result<GearItem, RetireItemError>> {
  const item = await deps.gearItemRepo.findById(itemId as any);
  if (!item) {
    return err({ type: 'not_found', id: itemId });
  }

  if (item.isCheckedOut()) {
    return err({ type: 'is_checked_out' });
  }

  const result = item.retire(deps);
  if (!result.ok) {
    return result;
  }

  await deps.gearItemRepo.save(result.value);
  return result;
}

// ============================================================================
// Get Gear Type Detail
// ============================================================================

export interface GetGearTypeDetailDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
}

export interface GearTypeDetail {
  gearType: GearType;
  items: GearItem[];
  statusCounts: {
    available: number;
    checkedOut: number;
    maintenance: number;
    retired: number;
    total: number;
  };
}

export async function getGearTypeDetail(
  deps: GetGearTypeDetailDeps,
  gearTypeId_: string
): Promise<Result<GearTypeDetail, { type: 'not_found'; id: string }>> {
  const gearType = await deps.gearTypeRepo.findById(gearTypeId(gearTypeId_));
  if (!gearType) {
    return err({ type: 'not_found', id: gearTypeId_ });
  }

  const items = await deps.gearItemRepo.findByGearTypeId(gearType.id);

  const statusCounts = {
    available: 0,
    checkedOut: 0,
    maintenance: 0,
    retired: 0,
    total: items.length
  };

  for (const item of items) {
    switch (item.status) {
      case GearStatus.AVAILABLE:
        statusCounts.available++;
        break;
      case GearStatus.CHECKED_OUT:
        statusCounts.checkedOut++;
        break;
      case GearStatus.MAINTENANCE:
        statusCounts.maintenance++;
        break;
      case GearStatus.RETIRED:
        statusCounts.retired++;
        break;
    }
  }

  return ok({ gearType, items, statusCounts });
}

// ============================================================================
// List Gear Types with Status
// ============================================================================

export interface ListGearTypesDeps {
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
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

export interface GearTypeListItem {
  gearType: GearType;
  categoryLabel: string;
  statusCounts: {
    available: number;
    checkedOut: number;
    maintenance: number;
    retired: number;
    total: number;
  };
}

export async function listGearTypesWithStatus(
  deps: ListGearTypesDeps,
  filters?: {
    searchTerm?: string;
    category?: GearCategory;
    hasItemsInStatus?: GearStatus;
  }
): Promise<GearTypeListItem[]> {
  let gearTypes: GearType[];

  if (filters?.searchTerm) {
    gearTypes = await deps.gearTypeRepo.search(filters.searchTerm);
  } else if (filters?.category) {
    gearTypes = await deps.gearTypeRepo.findByCategory(filters.category);
  } else {
    gearTypes = await deps.gearTypeRepo.findAll();
  }

  // If both searchTerm and category are provided, filter by category too
  if (filters?.searchTerm && filters?.category) {
    gearTypes = gearTypes.filter((gt) => gt.category === filters.category);
  }

  const allItems = await deps.gearItemRepo.findAll();

  // Build per-type status counts
  const itemsByType = new Map<string, GearItem[]>();
  for (const item of allItems) {
    const typeId = item.gearTypeId as string;
    if (!itemsByType.has(typeId)) {
      itemsByType.set(typeId, []);
    }
    itemsByType.get(typeId)!.push(item);
  }

  const results: GearTypeListItem[] = [];

  for (const gearType of gearTypes) {
    const items = itemsByType.get(gearType.id as string) ?? [];

    const statusCounts = {
      available: 0,
      checkedOut: 0,
      maintenance: 0,
      retired: 0,
      total: 0
    };

    if (gearType.isBulkTracked) {
      statusCounts.available = gearType.totalQuantity;
      statusCounts.total = gearType.totalQuantity;
    } else {
      statusCounts.total = items.length;
      for (const item of items) {
        switch (item.status) {
          case GearStatus.AVAILABLE:
            statusCounts.available++;
            break;
          case GearStatus.CHECKED_OUT:
            statusCounts.checkedOut++;
            break;
          case GearStatus.MAINTENANCE:
            statusCounts.maintenance++;
            break;
          case GearStatus.RETIRED:
            statusCounts.retired++;
            break;
        }
      }
    }

    // Apply status filter
    if (filters?.hasItemsInStatus) {
      const status = filters.hasItemsInStatus;
      const hasMatch =
        (status === GearStatus.AVAILABLE && statusCounts.available > 0) ||
        (status === GearStatus.CHECKED_OUT && statusCounts.checkedOut > 0) ||
        (status === GearStatus.MAINTENANCE && statusCounts.maintenance > 0) ||
        (status === GearStatus.RETIRED && statusCounts.retired > 0);
      if (!hasMatch) continue;
    }

    results.push({
      gearType,
      categoryLabel: CATEGORY_LABELS[gearType.category] ?? gearType.category,
      statusCounts
    });
  }

  // Sort by category label, then by name
  results.sort((a, b) => {
    const catCompare = a.categoryLabel.localeCompare(b.categoryLabel);
    if (catCompare !== 0) return catCompare;
    return a.gearType.name.localeCompare(b.gearType.name);
  });

  return results;
}
