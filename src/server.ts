import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { env } from './configs';
import { swaggerPlugin } from './interfaces/http/plugins';
import { paymentsController } from './interfaces/http/controllers/payments.controller';
import { webhookController } from './interfaces/http/controllers/webhook.controller';

  new Elysia({ adapter: node() })
    .use(swaggerPlugin)
    .use(paymentsController)
    .use(webhookController)
    .listen(env.app.port);

  console.log(`Сервер запущен: http://localhost:${env.app.port}`);
  console.log(`Swagger документация: http://localhost:${env.app.port}/swagger`);
