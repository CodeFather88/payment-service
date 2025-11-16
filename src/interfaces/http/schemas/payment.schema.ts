import { t, type Static } from 'elysia';

/**
 * Схема для создания платежа
 * API-слой выполняет базовую валидацию типов и форматов
 * Бизнес-валидация выполняется в доменном слое
 */
export const createPaymentSchema = t.Object({
  amount: t.Number({ 
    description: 'Сумма платежа (бизнес-валидация в домене)', 
    examples: [1000.50, 250.00] 
  }),
  currency: t.String({ 
    description: 'Код валюты, 3 символа', 
    minLength: 3, 
    maxLength: 3,
    examples: ['RUB', 'USD', 'EUR'] 
  }),
  description: t.Optional(t.String({ 
    description: 'Описание платежа', 
    examples: ['Оплата заказа #12345', 'Пополнение баланса'] 
  }))
}, {
  title: 'CreatePaymentRequest',
  description: 'Данные для создания нового платежа'
});

/**
 * Схема ответа при успешном создании платежа
 */
export const createPaymentResponseSchema = t.Object({
  paymentId: t.String({ 
    format: 'uuid', 
    description: 'Уникальный идентификатор созданного платежа' 
  })
}, {
  title: 'CreatePaymentResponse'
});

/**
 * Схема параметров для получения платежа по ID
 */
export const paymentIdParamSchema = t.Object({
  id: t.String({ 
    format: 'uuid', 
    description: 'Уникальный идентификатор платежа' 
  })
}, {
  title: 'PaymentIdParam'
});

/**
 * Схема ответа с ссылкой для оплаты
 */
export const paymentLinkResponseSchema = t.Object({
  link: t.String({ 
    format: 'uri',
    description: 'Ссылка для оплаты платежа' 
  })
}, {
  title: 'PaymentLinkResponse'
});

/**
 * Схема истории платежа
 */
export const paymentHistoryResponseSchema = t.Object({
  paymentId: t.String({ 
    format: 'uuid', 
    description: 'ID платежа' 
  }),
  status: t.String({ 
    description: 'Текущий статус платежа',
    examples: ['created', 'link_ready', 'client_redirected', 'success', 'failed', 'expired'] 
  }),
  history: t.Array(t.Object({
    type: t.String({ 
      description: 'Тип события',
      examples: ['payment_initiated', 'payment_link_generated', 'payment_succeeded'] 
    }),
    timestamp: t.String({ 
      format: 'date-time', 
      description: 'Время возникновения события' 
    }),
    payload: t.Unknown({ 
      description: 'Полезная нагрузка события' 
    })
  }), {
    description: 'История событий платежа в хронологическом порядке'
  })
}, {
  title: 'PaymentHistory'
});

/**
 * Схема ошибки валидации
 */
export const validationErrorSchema = t.Object({
  error: t.String({ description: 'Описание ошибки' }),
  details: t.Optional(t.Any({ description: 'Детали ошибок валидации' }))
}, {
  title: 'ValidationError'
});

/**
 * Схема общей ошибки
 */
export const errorSchema = t.Object({
  error: t.String({ description: 'Описание ошибки' })
}, {
  title: 'Error'
});

export type CreatePaymentDto = Static<typeof createPaymentSchema>;
export type CreatePaymentResponseDto = Static<typeof createPaymentResponseSchema>;
export type PaymentLinkResponseDto = Static<typeof paymentLinkResponseSchema>;
export type PaymentHistoryResponseDto = Static<typeof paymentHistoryResponseSchema>;
