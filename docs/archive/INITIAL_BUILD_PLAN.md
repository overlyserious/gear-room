# Gear Room Management System - Custom App Design

## Selected Approach: Option B - Local-First Web Application

Custom-built system following hexagonal architecture principles with NFC card integration and offline-first design.

---

## Domain Model

### Entities

**Member** - A person who can check out gear

```
├── id: MemberId (UUID)
├── collegeId: CollegeId (from NFC card - unique)
├── firstName, lastName, email, phone?
├── membershipStatus: ACTIVE | SUSPENDED | EXPIRED
├── waiverStatus (embedded):
│   ├── signed: boolean
│   ├── signedAt, expiresAt, waiverVersion
├── registeredAt, updatedAt
```

Key methods: `canCheckout()`, `hasValidWaiver()`, `signWaiver()`, `suspend()`, `reinstate()`

**GearType** - A category of gear (e.g., "Winter Sleeping Bag", "Trek 820 Bike")

```
├── id: GearTypeId (UUID)
├── name: string (e.g., "Winter Sleeping Bag")
├── category: SLEEPING_BAG | TENT | BIKE | STOVE | etc.
├── trackingMode: INDIVIDUAL | BULK
│   - INDIVIDUAL: each physical item has a GearItem record
│   - BULK: tracked by quantity only
├── totalQuantity: number (for BULK items)
├── availableQuantity: number (for BULK items, computed from checkouts)
├── checkoutDurationDays: number (default due date)
├── notes?, imageUrl?
```

**GearItem** - A specific piece of equipment (only for INDIVIDUAL tracking)

```
├── id: GearItemId (UUID)
├── gearTypeId: GearTypeId
├── code: string (unique identifier, e.g., "BIKE-003")
├── condition: EXCELLENT | GOOD | FAIR | NEEDS_REPAIR | RETIRED
├── status: AVAILABLE | CHECKED_OUT | MAINTENANCE | RETIRED
├── notes?, acquiredAt, retiredAt?
```

Key methods: `canCheckout()`, `markCheckedOut()`, `markReturned(condition)`, `retire()`

**Checkout** - A transaction where member borrows gear (aggregate root)

```
├── id: CheckoutId (UUID)
├── memberId: MemberId
├── items[]: CheckoutItem
│   ├── EITHER: gearItemId (for INDIVIDUAL tracking)
│   ├── OR: gearTypeId + quantity (for BULK tracking)
│   ├── checkedOutAt, dueAt
│   ├── returnedAt?, returnedQuantity? (for bulk)
│   ├── conditionAtCheckout?, conditionAtReturn? (for individual)
├── status: ACTIVE | PARTIALLY_RETURNED | COMPLETED
├── staffMemberId, createdAt, completedAt?, notes?
```

Key methods: `isOverdue()`, `getOverdueItems()`, `returnItem()`, `returnBulkItem(quantity)`, `extendDueDate()`

---

## Key Use Cases

### Member Workflow

- `registerMember(collegeId, name, email)` → Creates member with unsigned waiver
- `signWaiver(memberId, waiverVersion)` → Records waiver, sets expiry (1 year)
  - Waiver text displayed in-app, user scrolls and checks "I agree"
  - Store waiver version so you know which text they agreed to
- `lookupMemberByCollegeId(collegeId)` → NFC tap lookup

### Checkout Workflow

- `getCheckoutEligibility(memberId)` → Pre-check: waiver valid? No overdues?
- `createCheckout(memberId, items, staffId)` → Main checkout flow
  - Items can be: `{gearItemId}` for individual OR `{gearTypeId, quantity}` for bulk
- `returnItems(memberId, returns, staffId)` → Process returns
  - Returns can be: `{gearItemId, condition}` OR `{gearTypeId, quantity}`
- `quickReturnByCode(code, condition)` → Fast return for individually tracked items

### Inventory & Reporting

- `searchGear(searchTerm?, category?)` → Search gear types, shows availability
  - For BULK: shows "12 of 50 available"
  - For INDIVIDUAL: shows list of specific items (with codes)
- `getOverdueItemsDashboard()` → Dashboard with member contact info
- `getInventoryStatus()` → Counts by category and status

---

## Infrastructure Ports

**Repositories:**

- `MemberRepository`: findById, findByCollegeId, findAll, save
- `GearTypeRepository`: findById, findByCategory, search, save
- `GearItemRepository`: findById, findByCode, findByGearTypeId, save
- `CheckoutRepository`: findById, findByMemberId, findOverdue, save

**Services:**

- `IdGenerator`: UUID generation
- `Clock`: Current time (injectable for testing)
- `EventPublisher`: Domain events for audit trail
- `NfcCardReader`: Card tap callbacks
- `SyncService`: Online/offline sync status and triggers

---

## Technology Stack

| Layer              | Choice                   | Rationale                                                |
| ------------------ | ------------------------ | -------------------------------------------------------- |
| Framework          | **SvelteKit**            | Great offline/PWA support, simple stores, small bundles  |
| Local Storage      | **Dexie.js** (IndexedDB) | Best TS support, observable queries, future sync options |
| Styling            | **Tailwind CSS**         | Rapid UI development                                     |
| Backend (optional) | **Turso** (SQLite edge)  | Same schema local/remote, embedded replicas              |
| PWA                | **vite-plugin-pwa**      | Service worker generation, offline caching               |

---

## NFC Integration

**Primary: Web NFC API** (Chrome/Android)

- Native browser API for NFC reading
- Direct access to card data

**Fallback: Keyboard Wedge**

- USB NFC readers that type card ID like keyboard input
- Works on any browser/OS
- Detect rapid keystroke + Enter pattern

Both implement the same `NfcCardReader` port interface.

---

## Local-First Storage

**Strategy**: All writes go to IndexedDB first, sync when online

```
Browser (IndexedDB via Dexie)
├── members table
├── gear_items table
├── checkouts table
├── domain_events table (audit log)
└── sync_meta table
        │
        │ (when online)
        ▼
Remote Server (Turso SQLite - optional)
```

**Conflict resolution**: Last-write-wins for most fields, server-wins for checkout status (prevents double-checkout).

---

## Directory Structure

```
src/
├── domain/           # Pure business logic (no framework deps)
│   ├── entities/     # Member, GearItem, Checkout
│   ├── value-objects/# CollegeId, Email, Barcode, etc.
│   └── events/       # Domain events
│
├── application/      # Use cases + port interfaces
│   ├── ports/        # Repository & service interfaces
│   └── use-cases/    # registerMember, createCheckout, etc.
│
├── infrastructure/   # Adapter implementations
│   ├── repositories/ # Dexie implementations
│   ├── hardware/     # NFC readers
│   ├── storage/      # Database schema
│   └── environment.ts# Composition root
│
└── ui/               # SvelteKit app
    ├── routes/       # Pages: checkout, return, inventory, dashboard
    ├── lib/stores/   # Svelte stores wrapping use cases
    └── lib/components/
```

---

## Implementation Phases

### Phase 1: Domain Foundation

- [ ] Set up SvelteKit + TypeScript project
- [ ] Implement domain entities with factories and validation
- [ ] Implement value objects
- [ ] Set up Dexie database schema
- [ ] Implement repository adapters
- [ ] Create composition root (environment.ts)

### Phase 2: Core Workflows

- [ ] Member registration use case + UI
- [ ] Waiver signing use case + UI
- [ ] Member lookup use case
- [ ] Checkout use case + UI
- [ ] Return use case + UI

### Phase 3: Hardware Integration

- [ ] NFC reader adapters (Web NFC + keyboard wedge)
- [ ] Connect NFC to member lookup flow
- [ ] Barcode scanner for gear items

### Phase 4: Offline & PWA

- [ ] Service worker setup
- [ ] Offline indicators in UI
- [ ] PWA manifest and install prompt

### Phase 5: Dashboard & Polish

- [ ] Overdue items dashboard
- [ ] Inventory status view
- [ ] Error handling and edge cases
- [ ] Simple staff authentication (PIN)

### Phase 6: Sync (Optional)

- [ ] Turso backend setup
- [ ] Sync service implementation
- [ ] Conflict resolution

---

## Verification Plan

1. **Unit tests**: Domain entities (invariants, state transitions)
2. **Integration tests**: Use cases with mock repositories
3. **Manual testing**:
   - Register member → sign waiver → checkout gear → return gear
   - Test NFC tap flow with USB reader
   - Disconnect wifi → verify offline checkout works
   - Reconnect → verify data persists

---

## Hardware Needed

- USB NFC Reader (~$30-50) - e.g., ACR122U or similar
- Optional: USB barcode scanner for gear items ($20-40)
