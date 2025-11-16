import { t } from "elysia";

/**
 * Схема ошибки валидации
 */
export const validationErrorSchema = t.Object({
    error: t.String({ description: 'Описание ошибки' }),
    details: t.Optional(t.Any({ description: 'Детали ошибок валидации' }))
  }, {
    title: 'ValidationError'
  });
  