import { t, type Static } from 'elysia';

/**
 * Схема вебхука от платёжного провайдера
 */
export const webhookSchema = t.Object({
  paymentId: t.String({ 
    format: 'uuid', 
    description: 'ID платежа, который обновляется' 
  }),
  status: t.Union([
    t.Literal('success'),
    t.Literal('failed'),
    t.Literal('redirected')
  ], { 
    description: 'Статус платежа от провайдера',
    examples: ['success', 'failed', 'redirected']
  })
}, {
  title: 'WebhookRequest',
  description: 'Уведомление от платёжного провайдера о статусе платежа'
});

export type WebhookDto = Static<typeof webhookSchema>;
