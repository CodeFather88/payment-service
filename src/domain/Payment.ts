import { v4 as uuidv4 } from 'uuid';
import { PaymentEvent } from './types';
import { Result, Ok, Err } from '../shared/Result';

type Status = 'created' | 'link_ready' | 'client_redirected' | 'success' | 'failed' | 'expired';

export class Payment {
  private readonly id: string;
  private status: Status = 'created';
  private readonly amount: number;
  private readonly currency: string;
  private readonly description?: string;
  private readonly createdAt: Date = new Date();
  private updatedAt: Date = new Date();
  private readonly events: PaymentEvent[] = [];

  // Приватный конструктор, создание возможно только через create()
  private constructor(
    id: string,
    amount: number,
    currency: string,
    description?: string
  ) {
    this.id = id;
    this.amount = amount;
    this.currency = currency;
    this.description = description;
  }

  // Фабрика создания нового платежа
  static create(
    amount: number,
    currency: string,
    description?: string
  ): Result<Payment, Error> {

    if (amount <= 0) {
      return Err(new Error('Сумма должна быть положительной'));
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return Err(new Error('Неверный формат валюты. Пример: RUB'));
    }

    const payment = new Payment(uuidv4(), amount, currency, description);

    // Генерируется первое событие
    const event: PaymentEvent = {
      aggregateId: payment.id,
      type: 'payment_initiated',
      timestamp: new Date(),
      payload: { amount, currency, description }
    };

    payment.events.push(event);
    return Ok(payment);
  }

  // Геттеры
  getId(): string { return this.id; }
  getStatus(): Status { return this.status; }
  getEvents(): readonly PaymentEvent[] { return this.events; }

  // Восстановление платежа из истории событий
  static reconstitute(events: readonly PaymentEvent[]): Result<Payment, Error> {
    if (events.length === 0) {
      return Err(new Error('Нет событий для восстановления'));
    }

    const first = events[0];
    if (first.type !== 'payment_initiated') {
      return Err(new Error('Первое событие должно быть payment_initiated'));
    }

    const { aggregateId, payload } = first;
    const payment = new Payment(
      aggregateId,
      payload.amount as number,
      payload.currency as string,
      payload.description as string | undefined
    );

    // Применение всех событий, начиная со второго
    for (let i = 1; i < events.length; i++) {
      const result = payment.appendEvent(events[i]);
      if (result.kind === 'err') {
        return result;
      }
    }

    // Первое событие добавляем вручную, т.к. оно не проходило через appendEvent
    payment.events.unshift(events[0]);
    return Ok(payment);
  }

  // Добавление события с проверкой правил
  private appendEvent(event: Omit<PaymentEvent, 'aggregateId'>): Result<void, Error> {
    const fullEvent: PaymentEvent = { ...event, aggregateId: this.id };

    //правила переходов статусов
    if (event.type === 'payment_link_generated' && this.status !== 'created') {
      return Err(new Error('Ссылка уже была сгенерирована или платёж в неверном состоянии'));
    }
    if (event.type === 'client_redirected_to_provider' && this.status !== 'link_ready') {
      return Err(new Error('Клиент может перейти только после генерации ссылки'));
    }
    if (['payment_succeeded', 'payment_failed'].includes(event.type) &&
      !['link_ready', 'client_redirected'].includes(this.status)) {
      return Err(new Error('Платёж можно завершить только после действий клиента'));
    }

    // Применение эффекта события
    this.apply(fullEvent);
    this.events.push(fullEvent);
    return Ok();
  }

  // Применение эффекта события на состояние
  private apply(event: PaymentEvent): void {
    this.updatedAt = event.timestamp;

    switch (event.type) {
      case 'payment_link_generated':
        this.status = 'link_ready';
        break;
      case 'client_redirected_to_provider':
        this.status = 'client_redirected';
        break;
      case 'payment_succeeded':
        this.status = 'success';
        break;
      case 'payment_failed':
        this.status = 'failed';
        break;
      case 'payment_expired':
        this.status = 'expired';
        break;
    }
  }

  /**
   * Генерация ссылки для оплаты
   * @param paymentLinkDomain - базовый URL для формирования ссылки
   */
  generateLink(paymentLinkDomain: string): Result<PaymentEvent, Error> {
    const result = this.appendEvent({
      type: 'payment_link_generated',
      timestamp: new Date(),
      payload: { link: `${paymentLinkDomain}/${this.id}` }
    });

    return result.kind === 'ok'
      ? Ok(this.events[this.events.length - 1])
      : result;
  }

  // Клиент перешёл к провайдеру
  clientRedirected(): Result<PaymentEvent, Error> {
    const result = this.appendEvent({
      type: 'client_redirected_to_provider',
      timestamp: new Date(),
      payload: {}
    });
    return result.kind === 'ok' ? Ok(this.events[this.events.length - 1]) : result;
  }

  // Успех
  succeed(): Result<PaymentEvent, Error> {
    const result = this.appendEvent({
      type: 'payment_succeeded',
      timestamp: new Date(),
      payload: { transactionId: uuidv4() }
    });
    return result.kind === 'ok' ? Ok(this.events[this.events.length - 1]) : result;
  }

  // Ошибка
  fail(reason: string): Result<PaymentEvent, Error> {
    const result = this.appendEvent({
      type: 'payment_failed',
      timestamp: new Date(),
      payload: { reason }
    });
    return result.kind === 'ok' ? Ok(this.events[this.events.length - 1]) : result;
  }
  
}