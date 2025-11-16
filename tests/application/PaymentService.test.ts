import { test } from 'node:test';
import assert from 'node:assert';
import { PaymentService } from '../../src/application/PaymentService';
import { InMemoryEventStore } from '../../src/infrastructure/InMemoryEventStore';

test('Полный жизненный цикл платежа: создание → ссылка → webhook → история', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  // 1. Создание платежа
  const createResult = paymentService.createPayment(1000, 'RUB', 'Оплата заказа #123');
  assert.strictEqual(createResult.kind, 'ok', 'Платёж должен быть создан');
  
  if (createResult.kind !== 'ok') return;
  const { paymentId } = createResult.value;

  // 2. Генерация ссылки для оплаты
  const linkResult = paymentService.generatePaymentLink(paymentId);
  assert.strictEqual(linkResult.kind, 'ok', 'Ссылка должна быть сгенерирована');
  
  if (linkResult.kind === 'ok') {
    assert.ok(linkResult.value.includes(paymentId), 'Ссылка должна содержать ID платежа');
  }

  // 3. Webhook: клиент перешёл по ссылке
  const redirectResult = paymentService.handleWebhook(paymentId, 'redirected');
  assert.strictEqual(redirectResult.kind, 'ok', 'Webhook redirected должен быть обработан');

  // 4. Webhook: успешная оплата
  const successResult = paymentService.handleWebhook(paymentId, 'success');
  assert.strictEqual(successResult.kind, 'ok', 'Webhook success должен быть обработан');

  // 5. Получение истории платежа
  const historyResult = paymentService.getHistory(paymentId);
  assert.strictEqual(historyResult.kind, 'ok', 'История должна быть получена');
  
  if (historyResult.kind === 'ok') {
    const history = historyResult.value;
    
    assert.strictEqual(history.paymentId, paymentId, 'ID платежа должен совпадать');
    assert.strictEqual(history.status, 'success', 'Финальный статус должен быть "success"');
    assert.strictEqual(history.history.length, 4, 'Должно быть 4 события');
    
    // Проверяем типы событий в правильном порядке
    assert.strictEqual(history.history[0].type, 'payment_initiated');
    assert.strictEqual(history.history[1].type, 'payment_link_generated');
    assert.strictEqual(history.history[2].type, 'client_redirected_to_provider');
    assert.strictEqual(history.history[3].type, 'payment_succeeded');
  }
});

test('Создание платежа с невалидными данными возвращает ошибку', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  // Отрицательная сумма
  const result = paymentService.createPayment(-100, 'RUB');
  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка валидации');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Сумма должна быть положительной');
  }
});

test('Генерация ссылки для несуществующего платежа возвращает ошибку', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  const result = paymentService.generatePaymentLink('00000000-0000-0000-0000-000000000000');
  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Платёж не найден');
  }
});

test('Обработка webhook для несуществующего платежа возвращает ошибку', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  const result = paymentService.handleWebhook('00000000-0000-0000-0000-000000000000', 'success');
  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Платёж не найден');
  }
});

test('Получение истории несуществующего платежа возвращает ошибку', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  const result = paymentService.getHistory('00000000-0000-0000-0000-000000000000');
  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Платёж не найден');
  }
});

test('Невозможно обработать webhook success до генерации ссылки', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  // Создаём платёж
  const createResult = paymentService.createPayment(100, 'RUB');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind !== 'ok') return;
  const { paymentId } = createResult.value;

  // Пытаемся сразу отправить success без генерации ссылки
  const webhookResult = paymentService.handleWebhook(paymentId, 'success');
  assert.strictEqual(webhookResult.kind, 'err', 'Должна быть ошибка');
  
  if (webhookResult.kind === 'err') {
    assert.strictEqual(webhookResult.error.message, 'Платёж можно завершить только после действий клиента');
  }
});

test('Сценарий неудачной оплаты через webhook failed', () => {
  const eventStore = new InMemoryEventStore();
  const paymentService = new PaymentService(eventStore, 'https://pay.example.com');

  // Создаём платёж и генерируем ссылку
  const createResult = paymentService.createPayment(500, 'USD');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind !== 'ok') return;
  const { paymentId } = createResult.value;

  paymentService.generatePaymentLink(paymentId);
  paymentService.handleWebhook(paymentId, 'redirected');

  // Получаем webhook failed
  const failResult = paymentService.handleWebhook(paymentId, 'failed');
  assert.strictEqual(failResult.kind, 'ok', 'Webhook failed должен быть обработан');

  // Проверяем историю
  const historyResult = paymentService.getHistory(paymentId);
  assert.strictEqual(historyResult.kind, 'ok');
  
  if (historyResult.kind === 'ok') {
    assert.strictEqual(historyResult.value.status, 'failed', 'Финальный статус должен быть "failed"');
    
    const lastEvent = historyResult.value.history[historyResult.value.history.length - 1];
    assert.strictEqual(lastEvent.type, 'payment_failed');
  }
});

