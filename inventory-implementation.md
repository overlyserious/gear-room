# PRD: Inventory Management Route (`/inventory`)

## Context

The Gear Room app has routes for member lookup, checkout, return, and a dashboard — but no dedicated route for **managing the inventory itself**. Staff currently have no way to add new gear types, register individual items, edit details, or perform maintenance operations through the app. This PRD covers the `/inventory` route that lets gear room staff fully manage the catalog of outdoor equipment available for borrowing.

---

## User Stories

| # | Story |
|---|-------|
| S1 | **Browse all gear** — See everything organized by category with status counts at a glance |
| S2 | **Add a gear type** — Register a new product line (e.g., "MSR Hubba Hubba 2P Tent") with category, tracking mode, and checkout duration |
| S3 | **Add individual items** — For INDIVIDUAL-tracked types, register specific items with codes like "TENT-005" |
| S4 | **Edit gear type** — Update name, notes, checkout duration, bulk quantity |
| S5 | **Edit individual item** — Update condition or notes after inspection |
| S6 | **View gear type detail** — Drill into a type to see all its items with status and condition |
| S7 | **Search and filter** — Find gear by name, category, or item status |
| S8 | **Send to maintenance** — Flag an item with a note, removing it from circulation |
| S9 | **Return from maintenance** — Mark repaired, set new condition, re-enter lending pool |
| S10 | **Retire an item** — Permanently remove beyond-repair equipment |
| S11 | **Delete a gear type** — Remove erroneously added types (only if no items are checked out) |

---

## Page Design

### List View (default)

```
/inventory
+-----------------------------------------------------------------------+
| Inventory Management                          [+ Add Gear Type]       |
| < Back to Home                                                        |
+-----------------------------------------------------------------------+
| [Search by name...________] [Category ▼] [Status ▼]                  |
+-----------------------------------------------------------------------+
| Category: Bikes (1 type)                                              |
| +-------------------------------------------------------------------+ |
| | Trek 820 Mountain Bike        INDIVIDUAL   4 items                | |
| | Available: 2 | Checked Out: 2 | Maintenance: 0                   | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| Category: Pads (1 type)                                               |
| +-------------------------------------------------------------------+ |
| | Sleeping Pad                  BULK         Qty: 20                | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

- Gear types grouped by category with collapsible headers
- Each card shows: name, tracking mode badge, item/qty count, color-coded status bar
- Click a card to open detail view
- Search debounces 300ms; dropdowns filter immediately
- Empty state: "No gear types found. Add your first gear type to get started."

### Detail View (gear type selected)

```
+-----------------------------------------------------------------------+
| ← Back to list                                                        |
| Trek 820 Mountain Bike                              [Edit] [Delete]   |
| Category: Bikes | Tracking: Individual | Checkout: 3 days            |
| Notes: Available for day trips only                                   |
+-----------------------------------------------------------------------+
| Items (4 total)                            [+ Add Item]               |
+-----------------------------------------------------------------------+
| BIKE-001 | Excellent | Available   | [Maintenance] [Retire]          |
| BIKE-002 | Good      | Checked Out | (Out to Alex R.)               |
| BIKE-003 | Good      | Available   | [Maintenance] [Retire]          |
| BIKE-004 | Fair      | Maintenance | [Return from Maint.] [Retire]  |
+-----------------------------------------------------------------------+
```

- For BULK types: show total quantity with +/- controls instead of item table
- Context-sensitive action buttons per item based on current status
- Item rows show code, condition badge, status badge, and actions

### Modal Dialogs

1. **Add/Edit Gear Type** — name, category, tracking mode (create-only), checkout duration, quantity (BULK), notes
2. **Add Item** — code (with prefix suggestion), condition, notes
3. **Send to Maintenance** — notes/reason textarea
4. **Return from Maintenance** — new condition dropdown
5. **Confirm Dialog** — reusable for retire/delete with danger/warning variants

---

## New Use Cases

File: `src/application/use-cases/inventory-use-cases.ts`

| Use Case | Input | Output | Key Logic |
|----------|-------|--------|-----------|
| `createGearType` | name, category, trackingMode, checkoutDurationDays, totalQuantity?, notes? | `Result<GearType, Error>` | Check duplicate name, delegate to `GearType.create()` |
| `updateGearType` | id, name?, checkoutDurationDays?, notes? | `Result<GearType, Error>` | Load, call `gearType.update()`, save |
| `updateBulkQuantity` | gearTypeId, newQuantity | `Result<GearType, Error>` | Load, verify BULK, call `updateQuantity()` |
| `deleteGearType` | gearTypeId | `Result<void, Error>` | Reject if any items CHECKED_OUT; cascade delete items then type |
| `addGearItem` | gearTypeId, code, condition?, notes? | `Result<GearItem, Error>` | Verify type is INDIVIDUAL, check code uniqueness, `GearItem.create()` |
| `updateGearItem` | id, condition?, notes? | `Result<GearItem, Error>` | Load, update condition (reject if checked out), update notes |
| `sendItemToMaintenance` | itemId, notes? | `Result<GearItem, Error>` | Load, call `item.sendToMaintenance()` |
| `returnItemFromMaintenance` | itemId, condition | `Result<GearItem, Error>` | Load, call `item.returnFromMaintenance()` |
| `retireItem` | itemId | `Result<GearItem, Error>` | Reject if CHECKED_OUT, call `item.retire()` |
| `getGearTypeDetail` | gearTypeId | `Result<GearTypeDetail, Error>` | Load type + items, compute status counts |
| `listGearTypesWithStatus` | searchTerm?, category?, hasItemsInStatus? | `GearTypeListItem[]` | Load all types, compute per-type status counts, filter |

---

## Domain Changes

### Add `updateCondition` to `GearItem` entity

[gear-item.ts](src/domain/entities/gear-item.ts)

```typescript
updateCondition(
  condition: GearCondition,
  deps: { clock: { now(): Date } }
): Result<GearItem, { type: 'is_checked_out' } | { type: 'is_retired' }>
```

Rejects updates while checked out or retired. This is the only domain entity change needed.

---

## UI Components

All in `src/lib/inventory/`:

| Component | Purpose |
|-----------|---------|
| `GearTypeList.svelte` | Category-grouped list of gear type cards |
| `GearTypeCard.svelte` | Summary card with name, mode badge, status counts |
| `GearTypeDetailPanel.svelte` | Full detail view with item table or bulk controls |
| `GearItemRow.svelte` | Item row with condition/status badges and action buttons |
| `GearTypeForm.svelte` | Create/edit gear type modal |
| `GearItemForm.svelte` | Add item modal with code prefix suggestion |
| `MaintenanceDialog.svelte` | Send-to-maintenance notes form |
| `ReturnFromMaintenanceDialog.svelte` | Condition picker for maintenance return |
| `ConfirmDialog.svelte` | Reusable confirm for retire/delete |
| `StatusBadge.svelte` | Color-coded gear status badge |
| `ConditionBadge.svelte` | Color-coded condition badge |
| `TrackingModeBadge.svelte` | INDIVIDUAL/BULK badge |

Route page: `src/routes/inventory/+page.svelte`

---

## Files to Modify

| File | Change |
|------|--------|
| [use-cases/index.ts](src/application/use-cases/index.ts) | Export all inventory use cases |
| [stores/app.ts](src/lib/stores/app.ts) | Add ~11 inventory facade methods |
| [gear-item.ts](src/domain/entities/gear-item.ts) | Add `updateCondition()` method |

---

## Reuse from Existing Code

- **All repository interfaces and Dexie implementations** — no changes needed, existing queries cover all needs
- **`GearType.create()`, `.update()`, `.updateQuantity()`** — already exist
- **`GearItem` state transitions** — `sendToMaintenance`, `returnFromMaintenance`, `retire`, `updateNotes` all exist
- **`Result` pattern** — use `ok()`/`err()` from `src/application/result.ts`
- **`CATEGORY_LABELS` map** — from `dashboard-use-cases.ts` (extract to shared location or reference)
- **UI patterns** — Tailwind card layouts, search bars, status badges from checkout/return pages

---

## Edge Cases & Validation

- **Code uniqueness**: Globally unique, auto-uppercased, alphanumeric-with-dashes
- **Tracking mode immutable**: Cannot change after gear type creation
- **Cannot retire checked-out items**: Use case rejects with clear error
- **Cannot delete types with checked-out items**: Must return items first
- **Bulk quantity floor**: Cannot go below 0 (domain already enforces)
- **Code prefix suggestion**: UI suggests next code (e.g., TENT-004) based on existing items
- **Form validation**: Name required, checkout duration positive integer (default 7), quantity non-negative

---

## Implementation Phases

### Phase 1: Use cases & domain (no UI)
1. Add `updateCondition()` to GearItem
2. Create `inventory-use-cases.ts` with all 11 use cases
3. Export from index, add facade methods to `app.ts`
4. Write unit tests

### Phase 2: Read-only UI (list + detail)
1. Create route page and list/detail components
2. Create badge components (Status, Condition, TrackingMode)
3. Wire search and filter
4. Test with demo data

### Phase 3: Write operations UI (forms + actions)
1. Create form/dialog components
2. Wire all action buttons to facade methods
3. Add success/error feedback
4. End-to-end testing

---

## Verification

1. **Seed demo data** → navigate to `/inventory` → verify all gear types appear grouped by category with correct counts
2. **Add a gear type** → verify it appears in the list → drill into detail
3. **Add items** → verify codes are unique, prefix suggestion works
4. **Send to maintenance** → verify status changes, item removed from availability
5. **Return from maintenance** → verify condition updated, item available again
6. **Retire item** → verify it's grayed out, no longer in available count
7. **Delete gear type** → verify blocked if items checked out, succeeds otherwise
8. **Search/filter** → verify by name, category, and status filter
9. **Run `npm test`** → all existing + new tests pass
10. **Run `npm run build`** → clean build
