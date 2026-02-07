import { createEnvironment, resetEnvironment } from '../../infrastructure/environment.js';
import { resetDatabase } from '../../infrastructure/storage/database.js';
import { Member } from '../../domain/entities/member.js';
import { GearType } from '../../domain/entities/gear-type.js';
import { GearItem } from '../../domain/entities/gear-item.js';
import { Checkout } from '../../domain/entities/checkout.js';
import { GearCategory, GearCondition, TrackingMode, MembershipStatus } from '../../domain/types.js';

// Sample member data
const SAMPLE_MEMBERS = [
  {
    collegeId: 'STU001',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@college.edu',
    phone: '555-0101',
    signWaiver: true
  },
  {
    collegeId: 'STU002',
    firstName: 'Jordan',
    lastName: 'Chen',
    email: 'jordan.chen@college.edu',
    phone: '555-0102',
    signWaiver: true
  },
  {
    collegeId: 'STU003',
    firstName: 'Sam',
    lastName: 'Taylor',
    email: 'sam.taylor@college.edu',
    phone: '555-0103',
    signWaiver: false // No waiver signed
  },
  {
    collegeId: 'STU004',
    firstName: 'Morgan',
    lastName: 'Williams',
    email: 'morgan.williams@college.edu',
    phone: '555-0104',
    signWaiver: true,
    suspended: true // Suspended member
  },
  {
    collegeId: 'STU005',
    firstName: 'Casey',
    lastName: 'Johnson',
    email: 'casey.johnson@college.edu',
    signWaiver: true
  }
];

// Sample gear types
const SAMPLE_GEAR_TYPES = [
  // Individual tracking
  {
    name: 'Trek 820 Mountain Bike',
    category: GearCategory.BIKE,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 3,
    items: [
      { code: 'BIKE-001', condition: GearCondition.EXCELLENT },
      { code: 'BIKE-002', condition: GearCondition.GOOD },
      { code: 'BIKE-003', condition: GearCondition.GOOD },
      { code: 'BIKE-004', condition: GearCondition.FAIR }
    ]
  },
  {
    name: '2-Person Backpacking Tent',
    category: GearCategory.TENT,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'TENT-001', condition: GearCondition.EXCELLENT },
      { code: 'TENT-002', condition: GearCondition.GOOD },
      { code: 'TENT-003', condition: GearCondition.GOOD }
    ]
  },
  {
    name: '4-Person Camping Tent',
    category: GearCategory.TENT,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'TENT-101', condition: GearCondition.GOOD },
      { code: 'TENT-102', condition: GearCondition.FAIR }
    ]
  },
  {
    name: '20F Mummy Sleeping Bag',
    category: GearCategory.SLEEPING_BAG,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'BAG-001', condition: GearCondition.EXCELLENT },
      { code: 'BAG-002', condition: GearCondition.EXCELLENT },
      { code: 'BAG-003', condition: GearCondition.GOOD },
      { code: 'BAG-004', condition: GearCondition.GOOD },
      { code: 'BAG-005', condition: GearCondition.FAIR }
    ]
  },
  {
    name: '40F Rectangular Sleeping Bag',
    category: GearCategory.SLEEPING_BAG,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'BAG-101', condition: GearCondition.GOOD },
      { code: 'BAG-102', condition: GearCondition.GOOD },
      { code: 'BAG-103', condition: GearCondition.GOOD }
    ]
  },
  {
    name: '65L Backpacking Pack',
    category: GearCategory.BACKPACK,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'PACK-001', condition: GearCondition.EXCELLENT },
      { code: 'PACK-002', condition: GearCondition.GOOD },
      { code: 'PACK-003', condition: GearCondition.GOOD }
    ]
  },
  {
    name: 'MSR PocketRocket Stove',
    category: GearCategory.STOVE,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 7,
    items: [
      { code: 'STOVE-001', condition: GearCondition.EXCELLENT },
      { code: 'STOVE-002', condition: GearCondition.GOOD }
    ]
  },
  {
    name: 'Climbing Harness',
    category: GearCategory.CLIMBING,
    trackingMode: TrackingMode.INDIVIDUAL,
    checkoutDurationDays: 3,
    items: [
      { code: 'HARNESS-001', condition: GearCondition.GOOD, notes: 'Size: M' },
      { code: 'HARNESS-002', condition: GearCondition.GOOD, notes: 'Size: L' },
      { code: 'HARNESS-003', condition: GearCondition.FAIR, notes: 'Size: S' }
    ]
  },
  // Bulk tracking
  {
    name: 'Trekking Poles (pair)',
    category: GearCategory.POLES,
    trackingMode: TrackingMode.BULK,
    totalQuantity: 15,
    checkoutDurationDays: 7
  },
  {
    name: 'Sleeping Pad',
    category: GearCategory.PAD,
    trackingMode: TrackingMode.BULK,
    totalQuantity: 20,
    checkoutDurationDays: 7
  },
  {
    name: 'Cookware Set',
    category: GearCategory.COOKWARE,
    trackingMode: TrackingMode.BULK,
    totalQuantity: 10,
    checkoutDurationDays: 7
  },
  {
    name: 'Water Filter',
    category: GearCategory.WATER,
    trackingMode: TrackingMode.BULK,
    totalQuantity: 8,
    checkoutDurationDays: 7
  },
  {
    name: 'Headlamp',
    category: GearCategory.OTHER,
    trackingMode: TrackingMode.BULK,
    totalQuantity: 25,
    checkoutDurationDays: 7
  }
];

// Staff member ID for checkouts
const STAFF_MEMBER_ID = 'staff-001';

/**
 * Seed the database with demo data.
 * Clears existing data first.
 */
export async function seedDemoData(): Promise<{ memberCount: number; gearTypeCount: number; itemCount: number; checkoutCount: number }> {
  // Reset environment and database
  resetEnvironment();
  await resetDatabase();

  // Create fresh environment
  const env = createEnvironment();
  const { memberRepo, gearTypeRepo, gearItemRepo, checkoutRepo, idGenerator, clock } = env;

  const now = clock.now();
  const deps = { idGenerator, clock };

  // Track created entities for checkouts
  const memberIds: string[] = [];
  const gearItemIds: Map<string, string[]> = new Map(); // gearTypeId -> itemIds
  const bulkGearTypes: Map<string, { id: string; name: string }> = new Map(); // category -> { id, name }

  // 1. Create members
  for (const memberData of SAMPLE_MEMBERS) {
    const result = Member.create({
      collegeId: memberData.collegeId,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone
    }, deps);

    if (result.ok) {
      let member = result.value;

      // Sign waiver if needed
      if (memberData.signWaiver) {
        const waiverResult = member.signWaiver('1.0', deps);
        if (waiverResult.ok) {
          member = waiverResult.value;
        }
      }

      // Suspend if needed
      if (memberData.suspended) {
        const suspendResult = member.suspend(deps);
        if (suspendResult.ok) {
          member = suspendResult.value;
        }
      }

      await memberRepo.save(member);
      memberIds.push(member.id);
    }
  }

  // 2. Create gear types and items
  let totalItems = 0;
  for (const gearTypeData of SAMPLE_GEAR_TYPES) {
    const gearTypeResult = GearType.create({
      name: gearTypeData.name,
      category: gearTypeData.category,
      trackingMode: gearTypeData.trackingMode,
      totalQuantity: gearTypeData.totalQuantity,
      checkoutDurationDays: gearTypeData.checkoutDurationDays
    }, deps);

    if (gearTypeResult.ok) {
      const gearType = gearTypeResult.value;
      await gearTypeRepo.save(gearType);

      // Create individual items
      if (gearTypeData.trackingMode === TrackingMode.INDIVIDUAL && gearTypeData.items) {
        const itemIds: string[] = [];
        for (const itemData of gearTypeData.items) {
          const itemResult = GearItem.create({
            gearTypeId: gearType.id,
            code: itemData.code,
            condition: itemData.condition,
            notes: (itemData as any).notes
          }, deps);

          if (itemResult.ok) {
            await gearItemRepo.save(itemResult.value);
            itemIds.push(itemResult.value.id);
            totalItems++;
          }
        }
        gearItemIds.set(gearType.id, itemIds);
      } else {
        // Track bulk types
        bulkGearTypes.set(gearType.category, { id: gearType.id, name: gearType.name });
      }
    }
  }

  // 3. Create some checkouts (including one overdue)
  let checkoutCount = 0;

  // Find bikes and sleeping bags for checkouts
  const allGearTypes = await gearTypeRepo.findAll();
  const bikeType = allGearTypes.find(gt => gt.name.includes('Mountain Bike'));
  const bagType = allGearTypes.find(gt => gt.name.includes('Mummy'));
  const tentType = allGearTypes.find(gt => gt.name.includes('2-Person'));
  const padType = allGearTypes.find(gt => gt.name.includes('Sleeping Pad'));

  // Checkout 1: Alex has a bike and sleeping bag (due in 3 days)
  if (memberIds[0] && bikeType && bagType) {
    const bikeItems = gearItemIds.get(bikeType.id);
    const bagItems = gearItemIds.get(bagType.id);

    if (bikeItems?.[0] && bagItems?.[0]) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 3);

      const checkoutResult = Checkout.create({
        memberId: memberIds[0],
        staffMemberId: STAFF_MEMBER_ID,
        items: [
          { input: { type: 'individual', gearItemId: bikeItems[0] }, dueAt: dueDate, conditionAtCheckout: GearCondition.EXCELLENT },
          { input: { type: 'individual', gearItemId: bagItems[0] }, dueAt: dueDate, conditionAtCheckout: GearCondition.EXCELLENT }
        ],
        notes: 'Weekend camping trip'
      }, deps);

      if (checkoutResult.ok) {
        await checkoutRepo.save(checkoutResult.value);

        // Mark items as checked out
        const bikeItem = await gearItemRepo.findById(bikeItems[0] as any);
        const bagItem = await gearItemRepo.findById(bagItems[0] as any);

        if (bikeItem) {
          const result = bikeItem.markCheckedOut(deps);
          if (result.ok) await gearItemRepo.save(result.value);
        }
        if (bagItem) {
          const result = bagItem.markCheckedOut(deps);
          if (result.ok) await gearItemRepo.save(result.value);
        }

        checkoutCount++;
      }
    }
  }

  // Checkout 2: Jordan has a tent and sleeping pads (OVERDUE by 5 days)
  if (memberIds[1] && tentType && padType) {
    const tentItems = gearItemIds.get(tentType.id);

    if (tentItems?.[0]) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() - 5); // 5 days ago

      const checkoutResult = Checkout.create({
        memberId: memberIds[1],
        staffMemberId: STAFF_MEMBER_ID,
        items: [
          { input: { type: 'individual', gearItemId: tentItems[0] }, dueAt: dueDate, conditionAtCheckout: GearCondition.GOOD },
          { input: { type: 'bulk', gearTypeId: padType.id, quantity: 2 }, dueAt: dueDate }
        ],
        notes: 'Group camping trip'
      }, deps);

      if (checkoutResult.ok) {
        await checkoutRepo.save(checkoutResult.value);

        // Mark tent as checked out
        const tentItem = await gearItemRepo.findById(tentItems[0] as any);
        if (tentItem) {
          const result = tentItem.markCheckedOut(deps);
          if (result.ok) await gearItemRepo.save(result.value);
        }

        checkoutCount++;
      }
    }
  }

  // Checkout 3: Casey has a bike (due tomorrow)
  if (memberIds[4] && bikeType) {
    const bikeItems = gearItemIds.get(bikeType.id);

    if (bikeItems?.[1]) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 1);

      const checkoutResult = Checkout.create({
        memberId: memberIds[4],
        staffMemberId: STAFF_MEMBER_ID,
        items: [
          { input: { type: 'individual', gearItemId: bikeItems[1] }, dueAt: dueDate, conditionAtCheckout: GearCondition.GOOD }
        ]
      }, deps);

      if (checkoutResult.ok) {
        await checkoutRepo.save(checkoutResult.value);

        const bikeItem = await gearItemRepo.findById(bikeItems[1] as any);
        if (bikeItem) {
          const result = bikeItem.markCheckedOut(deps);
          if (result.ok) await gearItemRepo.save(result.value);
        }

        checkoutCount++;
      }
    }
  }

  return {
    memberCount: memberIds.length,
    gearTypeCount: SAMPLE_GEAR_TYPES.length,
    itemCount: totalItems,
    checkoutCount
  };
}

/**
 * Clear all data from the database.
 */
export async function clearAllData(): Promise<void> {
  resetEnvironment();
  await resetDatabase();
}

/**
 * Check if demo data exists.
 */
export async function hasDemoData(): Promise<boolean> {
  const env = createEnvironment();
  const members = await env.memberRepo.findAll({});
  return members.length > 0;
}
