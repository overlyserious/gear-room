import { createEnvironment, resetEnvironment, type AppEnvironment } from '../../infrastructure/environment.js';
import {
  registerMember,
  signWaiver,
  lookupMemberByCollegeId,
  getCheckoutEligibility,
  searchMembers,
  createCheckout,
  getActiveCheckoutsForMember,
  searchAvailableGear,
  returnItemByCode,
  returnItems,
  getMemberItemsToReturn,
  lookupItemByCode,
  getOverdueCheckouts,
  getInventoryStatus,
  createGearType,
  updateGearType,
  updateBulkQuantity,
  deleteGearType,
  addGearItem,
  updateGearItem,
  sendItemToMaintenance,
  returnItemFromMaintenance,
  retireItem,
  getGearTypeDetail,
  listGearTypesWithStatus,
  getMemberProfile,
  getMemberOpenItems,
  getMemberBehaviorSummary,
  getMemberActivityTimeline,
  type CreateMemberInput
} from '../../application/use-cases/index.js';
import type { Result } from '../../application/result.js';
import type { Member } from '../../domain/entities/member.js';
import type { GearCategory, GearCondition, GearStatus } from '../../domain/types.js';
import type { CreateGearTypeInput } from '../../domain/entities/gear-type.js';
import { seedDemoData, clearAllData, hasDemoData } from '../demo/seed-data.js';

let env: AppEnvironment | null = null;

function getEnv(): AppEnvironment {
  if (!env) {
    env = createEnvironment();
  }
  return env;
}

/**
 * App facade providing access to all use cases from the UI.
 * Uses the composition root to inject dependencies.
 */
export const app = {
  // ============================================================================
  // Member Operations
  // ============================================================================

  async registerMember(input: CreateMemberInput) {
    const e = getEnv();
    return registerMember(
      {
        memberRepo: e.memberRepo,
        idGenerator: e.idGenerator,
        clock: e.clock,
        eventPublisher: e.eventPublisher
      },
      input
    );
  },

  async signWaiver(memberId: string, waiverVersion: string) {
    const e = getEnv();
    return signWaiver(
      {
        memberRepo: e.memberRepo,
        clock: e.clock,
        eventPublisher: e.eventPublisher,
        idGenerator: e.idGenerator
      },
      { memberId, waiverVersion }
    );
  },

  async lookupMemberByCollegeId(collegeId: string) {
    const e = getEnv();
    return lookupMemberByCollegeId({ memberRepo: e.memberRepo }, collegeId);
  },

  async getCheckoutEligibility(memberId: string) {
    const e = getEnv();
    return getCheckoutEligibility(
      {
        memberRepo: e.memberRepo,
        checkoutRepo: e.checkoutRepo,
        clock: e.clock
      },
      memberId
    );
  },

  async searchMembers(searchTerm: string) {
    const e = getEnv();
    return searchMembers({ memberRepo: e.memberRepo }, searchTerm);
  },

  // ============================================================================
  // Checkout Operations
  // ============================================================================

  async createCheckout(input: {
    memberId: string;
    staffMemberId: string;
    items: Array<{ itemCode?: string; gearTypeId?: string; quantity?: number }>;
    notes?: string;
  }) {
    const e = getEnv();
    return createCheckout(
      {
        memberRepo: e.memberRepo,
        gearTypeRepo: e.gearTypeRepo,
        gearItemRepo: e.gearItemRepo,
        checkoutRepo: e.checkoutRepo,
        idGenerator: e.idGenerator,
        clock: e.clock,
        eventPublisher: e.eventPublisher
      },
      input
    );
  },

  async getActiveCheckoutsForMember(memberId: string) {
    const e = getEnv();
    return getActiveCheckoutsForMember(
      {
        checkoutRepo: e.checkoutRepo,
        gearTypeRepo: e.gearTypeRepo,
        gearItemRepo: e.gearItemRepo
      },
      memberId,
      e.clock.now()
    );
  },

  async searchAvailableGear(searchTerm?: string, category?: string) {
    const e = getEnv();
    return searchAvailableGear(
      {
        gearTypeRepo: e.gearTypeRepo,
        gearItemRepo: e.gearItemRepo
      },
      searchTerm,
      category
    );
  },

  // ============================================================================
  // Return Operations
  // ============================================================================

  async returnItemByCode(itemCode: string, condition: GearCondition, notes?: string) {
    const e = getEnv();
    return returnItemByCode(
      {
        gearItemRepo: e.gearItemRepo,
        checkoutRepo: e.checkoutRepo,
        gearTypeRepo: e.gearTypeRepo,
        memberRepo: e.memberRepo,
        clock: e.clock,
        eventPublisher: e.eventPublisher,
        idGenerator: e.idGenerator
      },
      { itemCode, condition, notes }
    );
  },

  async returnItems(
    checkoutId: string,
    returns: Array<{
      gearItemId?: string;
      condition?: GearCondition;
      gearTypeId?: string;
      quantity?: number;
      notes?: string;
    }>
  ) {
    const e = getEnv();
    return returnItems(
      {
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        memberRepo: e.memberRepo,
        clock: e.clock,
        eventPublisher: e.eventPublisher,
        idGenerator: e.idGenerator
      },
      { checkoutId, returns }
    );
  },

  async getMemberItemsToReturn(memberId: string) {
    const e = getEnv();
    return getMemberItemsToReturn(
      {
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        memberRepo: e.memberRepo,
        clock: e.clock
      },
      memberId
    );
  },

  async lookupItemByCode(code: string) {
    const e = getEnv();
    return lookupItemByCode(
      {
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        checkoutRepo: e.checkoutRepo,
        memberRepo: e.memberRepo
      },
      code
    );
  },

  // ============================================================================
  // Dashboard Operations
  // ============================================================================

  async getOverdueCheckouts() {
    const e = getEnv();
    return getOverdueCheckouts({
      checkoutRepo: e.checkoutRepo,
      memberRepo: e.memberRepo,
      gearTypeRepo: e.gearTypeRepo,
      gearItemRepo: e.gearItemRepo,
      clock: e.clock
    });
  },

  async getInventoryStatus() {
    const e = getEnv();
    return getInventoryStatus({
      gearTypeRepo: e.gearTypeRepo,
      gearItemRepo: e.gearItemRepo
    });
  },

  // ============================================================================
  // Inventory Operations
  // ============================================================================

  async createGearType(input: CreateGearTypeInput) {
    const e = getEnv();
    return createGearType(
      { gearTypeRepo: e.gearTypeRepo, idGenerator: e.idGenerator, clock: e.clock },
      input
    );
  },

  async updateGearType(input: { id: string; name?: string; checkoutDurationDays?: number; notes?: string }) {
    const e = getEnv();
    return updateGearType(
      { gearTypeRepo: e.gearTypeRepo, clock: e.clock },
      input
    );
  },

  async updateBulkQuantity(gearTypeId: string, newQuantity: number) {
    const e = getEnv();
    return updateBulkQuantity(
      { gearTypeRepo: e.gearTypeRepo, clock: e.clock },
      gearTypeId,
      newQuantity
    );
  },

  async deleteGearType(gearTypeId: string) {
    const e = getEnv();
    return deleteGearType(
      { gearTypeRepo: e.gearTypeRepo, gearItemRepo: e.gearItemRepo },
      gearTypeId
    );
  },

  async addGearItem(input: { gearTypeId: string; code: string; condition?: GearCondition; notes?: string }) {
    const e = getEnv();
    return addGearItem(
      { gearTypeRepo: e.gearTypeRepo, gearItemRepo: e.gearItemRepo, idGenerator: e.idGenerator, clock: e.clock },
      input
    );
  },

  async updateGearItem(input: { id: string; condition?: GearCondition; notes?: string }) {
    const e = getEnv();
    return updateGearItem(
      { gearItemRepo: e.gearItemRepo, clock: e.clock },
      input
    );
  },

  async sendItemToMaintenance(itemId: string, notes?: string) {
    const e = getEnv();
    return sendItemToMaintenance(
      { gearItemRepo: e.gearItemRepo, clock: e.clock },
      itemId,
      notes
    );
  },

  async returnItemFromMaintenance(itemId: string, condition: GearCondition) {
    const e = getEnv();
    return returnItemFromMaintenance(
      { gearItemRepo: e.gearItemRepo, clock: e.clock },
      itemId,
      condition
    );
  },

  async retireItem(itemId: string) {
    const e = getEnv();
    return retireItem(
      { gearItemRepo: e.gearItemRepo, clock: e.clock },
      itemId
    );
  },

  async getGearTypeDetail(gearTypeId: string) {
    const e = getEnv();
    return getGearTypeDetail(
      { gearTypeRepo: e.gearTypeRepo, gearItemRepo: e.gearItemRepo },
      gearTypeId
    );
  },

  async listGearTypesWithStatus(filters?: { searchTerm?: string; category?: GearCategory; hasItemsInStatus?: GearStatus }) {
    const e = getEnv();
    return listGearTypesWithStatus(
      { gearTypeRepo: e.gearTypeRepo, gearItemRepo: e.gearItemRepo },
      filters
    );
  },

  // ============================================================================
  // Member History Operations
  // ============================================================================

  async getMemberProfile(memberId: string) {
    const e = getEnv();
    return getMemberProfile(
      {
        memberRepo: e.memberRepo,
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        clock: e.clock
      },
      memberId
    );
  },

  async getMemberOpenItems(memberId: string) {
    const e = getEnv();
    return getMemberOpenItems(
      {
        memberRepo: e.memberRepo,
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        clock: e.clock
      },
      memberId
    );
  },

  async getMemberBehaviorSummary(memberId: string) {
    const e = getEnv();
    return getMemberBehaviorSummary(
      {
        memberRepo: e.memberRepo,
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        clock: e.clock
      },
      memberId
    );
  },

  async getMemberActivityTimeline(memberId: string, limit?: number) {
    const e = getEnv();
    return getMemberActivityTimeline(
      {
        memberRepo: e.memberRepo,
        checkoutRepo: e.checkoutRepo,
        gearItemRepo: e.gearItemRepo,
        gearTypeRepo: e.gearTypeRepo,
        clock: e.clock
      },
      memberId,
      limit
    );
  },

  // ============================================================================
  // Demo Mode Operations
  // ============================================================================

  async seedDemoData() {
    // Reset the environment reference so it gets recreated after seeding
    env = null;
    const result = await seedDemoData();
    return result;
  },

  async clearAllData() {
    env = null;
    await clearAllData();
  },

  async hasDemoData() {
    return hasDemoData();
  }
};
