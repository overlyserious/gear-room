// Member use cases
export {
  registerMember,
  signWaiver,
  lookupMemberByCollegeId,
  getCheckoutEligibility,
  searchMembers,
  type RegisterMemberError,
  type RegisterMemberDeps,
  type SignWaiverError,
  type SignWaiverDeps,
  type SignWaiverInput,
  type LookupMemberDeps,
  type CheckoutEligibility,
  type CheckoutIneligibilityReason,
  type GetCheckoutEligibilityDeps,
  type SearchMembersDeps,
  type CreateMemberInput
} from './member-use-cases.js';

// Checkout use cases
export {
  createCheckout,
  getActiveCheckoutsForMember,
  searchAvailableGear,
  type CreateCheckoutError,
  type CreateCheckoutDeps,
  type CheckoutItemRequest,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type GetActiveCheckoutsDeps,
  type ActiveCheckoutSummary,
  type SearchGearDeps,
  type GearSearchResult
} from './checkout-use-cases.js';

// Return use cases
export {
  returnItemByCode,
  returnItems,
  getMemberItemsToReturn,
  lookupItemByCode,
  type ReturnItemError,
  type ReturnItemDeps,
  type ReturnItemInput,
  type ReturnItemResult,
  type ReturnItemsError,
  type ReturnItemsDeps,
  type ReturnItemsInput,
  type ReturnItemsResult,
  type GetItemsToReturnDeps,
  type ItemToReturn,
  type MemberItemsToReturn,
  type LookupItemDeps,
  type ItemLookupResult
} from './return-use-cases.js';
