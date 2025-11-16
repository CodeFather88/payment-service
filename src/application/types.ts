import { EventType } from '../domain/types';

/**
 * История одного события платежа
 */
export interface PaymentEventHistory {
  type: EventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

/**
 * Полная история платежа со всеми событиями
 */
export interface PaymentHistoryResponse {
  paymentId: string;
  status: string;
  history: PaymentEventHistory[];
}

