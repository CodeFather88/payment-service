import { Elysia, t } from 'elysia';
import { di } from '../plugins';
import { errorResponse } from '../helpers/response';
import { validationErrorSchema, webhookSchema } from '../schemas';

/**
 * Контроллер для обработки webhook от платёжного провайдера
 */
export const webhookController = new Elysia()
  .use(di)
  .post('/webhook', ({ body, paymentService }) => {
    const result = paymentService.handleWebhook(
      body.paymentId,
      body.status
    );

    if (result.kind === 'err') {
      return errorResponse(result.error.message, 400);
    }

    return new Response(null, { status: 200 });
  }, {
    body: webhookSchema,
    response: {
      200: t.Null({ description: 'Webhook успешно обработан, платёж обновлён' }),
      400: validationErrorSchema
    },
    detail: {
      tags: ['webhooks'],
      summary: 'Обработать webhook от платёжного провайдера',
      description: 'Принимает уведомление о статусе платежа от внешнего платёжного провайдера. Генерирует соответствующие события (client_redirected_to_provider, payment_succeeded, payment_failed) в зависимости от статуса.'
    }
  });
