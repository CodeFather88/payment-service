/**
 * Вспомогательные функции для формирования HTTP ответов
 */

/**
 * Создает JSON ответ с ошибкой
 */
export function errorResponse(message: string, status: number, details?: unknown): Response {
  const body: { error: string; details?: unknown } = { error: message };
  if (details !== undefined) {
    body.details = details;
  }

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Создает JSON ответ с данными
 */
export function jsonResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

