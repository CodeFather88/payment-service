import { Payment } from '../domain/Payment';
import { PaymentEvent } from '../domain/types';
import { InMemoryEventStore } from '../infrastructure/InMemoryEventStore';
import { Result, Ok, Err } from '../shared/Result';
import { PaymentHistoryResponse } from './types';

export class PaymentService {
    constructor(
        private readonly eventStore: InMemoryEventStore,
        private readonly paymentLinkDomain: string
    ) { }

    /**
    * Создать платёж
    * @returns { paymentId }
    */
    createPayment(
        amount: number,
        currency: string,
        description?: string
    ): Result<{ paymentId: string }, Error> {
        //Создание платежа в домене
        const paymentResult = Payment.create(amount, currency, description);
        if (paymentResult.kind === 'err') {
            return Err(paymentResult.error);
        }

        const payment = paymentResult.value;

        //сохранение первого события платежа в памяти
        const initEvent = payment.getEvents()[0];
        this.eventStore.append(initEvent);

        return Ok({ paymentId: payment.getId() });
    }

    /**
    * Сгенерировать ссылку для оплаты
    */
    generatePaymentLink(paymentId: string): Result<string, Error> {
        const events = this.eventStore.getEvents(paymentId);
        if (events.length === 0) {
            return Err(new Error('Платёж не найден'));
        }

        const paymentResult = Payment.reconstitute(events);
        if (paymentResult.kind === 'err') {
            return paymentResult;
        }

        const payment = paymentResult.value;

        // генерация ссылки
        const linkResult = payment.generateLink(this.paymentLinkDomain);
        if (linkResult.kind === 'err') {
            return linkResult;
        }

        // Сохранение нового события
        this.eventStore.append(linkResult.value);

        return Ok(linkResult.value.payload.link as string);
    }

    /**
    * Обработка webhook от платёжного провайдера
    */
    handleWebhook(
        paymentId: string,
        status: 'success' | 'failed' | 'redirected'
    ): Result<void, Error> {
        const events = this.eventStore.getEvents(paymentId);
        if (events.length === 0) {
            return Err(new Error('Платёж не найден'));
        }

        const paymentResult = Payment.reconstitute(events);
        if (paymentResult.kind === 'err') return paymentResult;

        const payment = paymentResult.value;
        let result: Result<PaymentEvent, Error>;

        if (status === 'redirected') {
            result = payment.clientRedirected();
        } else if (status === 'success') {
            result = payment.succeed();
        } else {
            result = payment.fail('Отклонено провайдером');
        }

        if (result.kind === 'err') return result;

        this.eventStore.append(result.value);
        return Ok();
    }

    /**
    * Получить историю платежа
    */
    getHistory(paymentId: string): Result<PaymentHistoryResponse, Error> {
        if (!this.eventStore.hasPayment(paymentId)) {
            return Err(new Error('Платёж не найден'));
        }

        const events = this.eventStore.getEvents(paymentId);
        const paymentResult = Payment.reconstitute(events);
        if (paymentResult.kind === 'err') return paymentResult;

        const payment = paymentResult.value;

        return Ok({
            paymentId: payment.getId(),
            status: payment.getStatus(),
            history: events.map(e => ({
                type: e.type,
                timestamp: e.timestamp.toISOString(),
                payload: e.payload
            }))
        });
    }
}