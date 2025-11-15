import { PaymentEvent } from '../domain/types';

/**
 * В качестве дальнейшего развития данный сервис можно заменить сохранением events в редисе и в БД,
 * поскольку при горизонтальном масштабировании Map не прокатит,
 * нужно централизовать хранение данных
*/
export class InMemoryEventStore {
  // Ключ — ID платежа, значение — массив событий (по порядку)
  private readonly store: Map<string, PaymentEvent[]> = new Map();

  // Добавить событие в конец истории
  append(event: PaymentEvent): void {
    const events = this.store.get(event.aggregateId) ?? [];
    events.push(event);
    this.store.set(event.aggregateId, events);
  }

  // Получить все события по ID платежа
  getEvents(aggregateId: string): readonly PaymentEvent[] {
    return this.store.get(aggregateId) ?? [];
  }

  // Проверяет, есть ли хоть одно событие? (для проверки существования платежа)
  hasPayment(paymentId: string): boolean {
    return this.store.has(paymentId);
  }
}