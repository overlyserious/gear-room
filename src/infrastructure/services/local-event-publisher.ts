import type { EventPublisher, DomainEvent } from '../../application/ports/services.js';
import type { GearRoomDatabase } from '../storage/database.js';

/**
 * Local event publisher that stores events in IndexedDB.
 * Events are stored for audit trail and potential future sync.
 */
export class LocalEventPublisher implements EventPublisher {
  constructor(private readonly db: GearRoomDatabase) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.db.domainEvents.add({
      id: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt.toISOString(),
      payload: JSON.stringify(event.payload),
      synced: false
    });
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    await this.db.domainEvents.bulkAdd(
      events.map((event) => ({
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt.toISOString(),
        payload: JSON.stringify(event.payload),
        synced: false
      }))
    );
  }
}
