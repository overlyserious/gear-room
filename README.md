# Gear Room

A local-first web application for managing outdoor gear checkouts at a college gear room. Members register, sign waivers, and check out equipment. All data lives in the browser via IndexedDB — no server required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 / Svelte 5 |
| Storage | Dexie.js 4 (IndexedDB) |
| Styling | Tailwind CSS 3.4 |
| Build | Vite 6, static adapter (SPA) |
| Testing | Vitest 2, fake-indexeddb |

## Getting Started

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # static build to /build
npm run preview    # preview production build
npm run check      # type-check
npm run test       # run tests
```

## Architecture

The project follows hexagonal architecture (ports & adapters). See [PRINCIPLES.md](PRINCIPLES.md) for the full rationale.

```
src/
├── domain/           # Pure business logic — no framework deps
│   ├── entities/     # Member, GearType, GearItem, Checkout
│   ├── value-objects/ # CollegeId, Email, typed IDs
│   └── types.ts      # Enums: MembershipStatus, GearCategory, etc.
│
├── application/      # Use cases + port interfaces
│   ├── ports/        # Repository and service interfaces
│   ├── use-cases/    # registerMember, createCheckout, returnItems, etc.
│   └── result.ts     # Result<T, E> type for error handling
│
├── infrastructure/   # Adapter implementations
│   ├── repositories/ # Dexie implementations of repository ports
│   ├── services/     # UUID generator, system clock, event publisher
│   ├── storage/      # Dexie database schema
│   └── environment.ts # Composition root — wires dependencies
│
├── lib/              # UI support
│   ├── stores/       # App facade (wraps use cases for UI consumption)
│   ├── dashboard/    # Dashboard widgets (overdue items, inventory status)
│   └── demo/         # Seed data for development
│
├── routes/           # SvelteKit pages
│   ├── +page.svelte         # Home — member lookup
│   ├── checkout/             # Checkout flow
│   ├── return/               # Return flow
│   └── dashboard/            # Dashboard with widgets
│
└── test-utils/       # Test fixtures and helpers
```

### Dependency flow

```
UI → Application (use cases, ports) → Domain ← Infrastructure (adapters)
```

Use cases accept dependencies via a `deps` parameter and return `Result<T, E>` types. The UI accesses use cases through the app facade store in `src/lib/stores/app.ts`.

## Domain Model

**Member** — a person who can check out gear. Identified by college ID (NFC card). Must have a signed, unexpired waiver and active status to check out.

**GearType** — a category of gear (e.g. "Winter Sleeping Bag", "Trek 820 Bike"). Tracked in one of two modes:
- **Individual** — each physical item has a `GearItem` record with a unique code
- **Bulk** — tracked by quantity only (e.g. 50 sleeping pads)

**GearItem** — a specific piece of individually-tracked equipment. Has a code (e.g. `BIKE-003`), condition rating, and availability status.

**Checkout** — a transaction where a member borrows gear. Contains one or more items (individual or bulk). Supports partial returns and tracks condition at checkout and return.

## Features

- Member registration, waiver signing, and lookup by college ID
- Gear search by name or category with availability display
- Multi-item checkout with automatic due date calculation
- Return by item code (quick scan) or by member (view all checked-out items)
- Condition assessment on return; auto-routes to maintenance if needed
- Overdue items dashboard with member contact info
- Inventory status overview by category
- Demo data seeding for development
- Offline-capable — all data persists in the browser
