import { t } from "elysia";

/**
 * Схема общей ошибки
 */
export const errorSchema = t.Object({
    error: t.String({ description: 'Описание ошибки' })
  }, {
    title: 'Error'
  });
  