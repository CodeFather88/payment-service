import { swagger } from '@elysiajs/swagger';

/**
 * Плагин для документации API через Swagger
 * Доступен по адресу /swagger
 */
export const swaggerPlugin = swagger({
  documentation: {
    info: {
      title: 'Payment Service API',
      version: '1.0.0'
    },
    tags: [
      { name: 'payments', description: 'Операции с платежами' },
      { name: 'webhooks', description: 'Обработка webhook от платёжных провайдеров' }
    ]
  }
});

