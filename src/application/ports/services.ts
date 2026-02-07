/**
 * Service interface for generating unique identifiers.
 */
export interface IdGenerator {
  generate(): string;
}

/**
 * Service interface for getting the current time.
 * Abstracted for testability.
 */
export interface Clock {
  now(): Date;
  today(): Date;
}

/**
 * Domain event for publishing.
 */
export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

/**
 * Service interface for publishing domain events.
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}
