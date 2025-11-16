import { Elysia } from 'elysia';
import { 
  createPaymentSchema, 
  createPaymentResponseSchema,
  paymentIdParamSchema,
  paymentLinkResponseSchema,
  paymentHistoryResponseSchema,
  validationErrorSchema,
  errorSchema,
} from '../schemas';
import { di } from '../plugins';
import { errorResponse, jsonResponse } from '../helpers/response';

/**
 * Контроллер для работы с платежами
 */
export const paymentsController = new Elysia({ prefix: '/payments' })
  .use(di)
  /**
   * Создать новый платёж
   */
  .post('/', async ({ body, paymentService }) => {
    const result = paymentService.createPayment(
      body.amount,
      body.currency,
      body.description
    );

    if (result.kind === 'err') {
      return errorResponse(result.error.message, 500);
    }

    return jsonResponse(result.value, 201);
  }, {
    body: createPaymentSchema,
    response: {
      201: createPaymentResponseSchema,
      400: validationErrorSchema,
      500: errorSchema
    },
    detail: {
      tags: ['payments'],
      summary: 'Создать новый платёж',
      description: 'Инициирует новый платёж'
    }
  })
  /**
   * Сгенерировать ссылку для оплаты
   */
  .post('/:id/link', ({ params, paymentService }) => {
    const result = paymentService.generatePaymentLink(params.id);

    if (result.kind === 'err') {
      return errorResponse(result.error.message, 400);
    }

    return jsonResponse({ link: result.value });
  }, {
    params: paymentIdParamSchema,
    response: {
      200: paymentLinkResponseSchema,
      400: errorSchema,
      404: errorSchema
    },
    detail: {
      tags: ['payments'],
      summary: 'Сгенерировать ссылку для оплаты',
      description: 'Генерирует уникальную ссылку для оплаты конкретного платежа'
    }
  })

  /**
   * Получить историю платежа
   */
  .get('/:id/history', ({ params, paymentService }) => {
    const result = paymentService.getHistory(params.id);

    if (result.kind === 'err') {
      return errorResponse(result.error.message, 404);
    }

    return jsonResponse(result.value);
  }, {
    params: paymentIdParamSchema,
    response: {
      200: paymentHistoryResponseSchema,
      404: errorSchema
    },
    detail: {
      tags: ['payments'],
      summary: 'Получить историю платежа',
      description: 'Возвращает полную историю событий платежа'
    }
  });
