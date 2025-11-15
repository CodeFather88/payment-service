export type EventType =
  | 'payment_initiated'
  | 'payment_link_generated'
  | 'client_redirected_to_provider'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_expired';

export interface PaymentEvent {
  aggregateId: string;
  type: EventType;
  timestamp: Date;
  payload: Record<string, unknown>;
}