import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { z } from 'zod';
import { InMemoryEventStore } from './infrastructure/InMemoryEventStore';
import { PaymentService } from './application/PaymentService';
import { env } from '../configs';

try {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore);

  const app = new Elysia({ adapter: node() })
    .get('/payments/:id/history', ({ params }) => {
      const result = paymentService.getHistory(params.id);
      if (result.kind === 'err') {
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return Response.json(result.value);
    })
    .post('/payments', async ({ body }) => {
      const schema = z.object({
        amount: z.number().positive(),
        currency: z.string().length(3),
        description: z.string().optional()
      });

      const parse = schema.safeParse(body);
      if (!parse.success) {
        return new Response(JSON.stringify({ error: 'Неверные данные' }), { status: 400 });
      }

      const result = paymentService.createPayment(
        parse.data.amount,
        parse.data.currency,
        parse.data.description
      );

      if (result.kind === 'err') {
        return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
      }

      return Response.json(result.value, { status: 201 });
    })
    .post('/webhook', ({ body }) => {
      const schema = z.object({
        paymentId: z.string().uuid(),
        status: z.enum(['success', 'failed', 'redirected'])
      });

      const parse = schema.safeParse(body);
      if (!parse.success) {
        return new Response('Bad webhook', { status: 400 });
      }

      const result = paymentService.handleWebhook(parse.data.paymentId, parse.data.status);
      return new Response(null, { status: result.kind === 'ok' ? 200 : 400 });
    })
    .listen(env.app.port);

  console.log(`Сервер запущен: http://localhost:${env.app.port}`);
} catch (error) {
  console.error('Не удалось запустить сервер:', error);
  throw error;
}