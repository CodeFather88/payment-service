import { test } from 'node:test';
import assert from 'node:assert';
import { Payment } from '../../src/domain/Payment';

test('Создание платежа с корректными данными', () => {
  const result = Payment.create(1000, 'RUB', 'Тестовый платёж');

  assert.strictEqual(result.kind, 'ok', 'Платёж должен быть создан успешно');
  
  if (result.kind === 'ok') {
    const payment = result.value;
    assert.strictEqual(payment.getStatus(), 'created', 'Статус должен быть "created"');
    
    const events = payment.getEvents();
    assert.strictEqual(events.length, 1, 'Должно быть одно событие');
    assert.strictEqual(events[0].type, 'payment_initiated', 'Первое событие должно быть payment_initiated');
  }
});

test('Создание платежа с отрицательной суммой должно вернуть ошибку', () => {
  const result = Payment.create(-100, 'RUB');

  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Сумма должна быть положительной');
  }
});

test('Создание платежа с нулевой суммой должно вернуть ошибку', () => {
  const result = Payment.create(0, 'RUB');

  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Сумма должна быть положительной');
  }
});

test('Создание платежа с неверным форматом валюты должно вернуть ошибку', () => {
  const result = Payment.create(100, 'usd');

  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
  
  if (result.kind === 'err') {
    assert.strictEqual(result.error.message, 'Неверный формат валюты. Пример: RUB');
  }
});

test('Создание платежа с валютой неверной длины должно вернуть ошибку', () => {
  const result = Payment.create(100, 'RU');

  assert.strictEqual(result.kind, 'err', 'Должна быть ошибка');
});

test('Корректный переход статусов: created → link_ready → client_redirected → success', () => {
  const createResult = Payment.create(100, 'RUB');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind === 'ok') {
    const payment = createResult.value;
    
    // Генерация ссылки
    const linkResult = payment.generateLink('https://pay.example.com');
    assert.strictEqual(linkResult.kind, 'ok', 'Генерация ссылки должна быть успешной');
    assert.strictEqual(payment.getStatus(), 'link_ready', 'Статус должен быть "link_ready"');
    
    // Клиент перешёл по ссылке
    const redirectResult = payment.clientRedirected();
    assert.strictEqual(redirectResult.kind, 'ok', 'Переход должен быть успешным');
    assert.strictEqual(payment.getStatus(), 'client_redirected', 'Статус должен быть "client_redirected"');
    
    // Успешная оплата
    const successResult = payment.succeed();
    assert.strictEqual(successResult.kind, 'ok', 'Успешная оплата должна быть выполнена');
    assert.strictEqual(payment.getStatus(), 'success', 'Статус должен быть "success"');
    
    // Проверяем, что все события записаны
    const events = payment.getEvents();
    assert.strictEqual(events.length, 4, 'Должно быть 4 события');
    assert.strictEqual(events[0].type, 'payment_initiated');
    assert.strictEqual(events[1].type, 'payment_link_generated');
    assert.strictEqual(events[2].type, 'client_redirected_to_provider');
    assert.strictEqual(events[3].type, 'payment_succeeded');
  }
});

test('Невозможно сгенерировать ссылку дважды', () => {
  const createResult = Payment.create(100, 'RUB');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind === 'ok') {
    const payment = createResult.value;
    
    // Первая генерация - успешна
    const firstLink = payment.generateLink('https://pay.example.com');
    assert.strictEqual(firstLink.kind, 'ok');
    
    // Вторая генерация - должна вернуть ошибку
    const secondLink = payment.generateLink('https://pay.example.com');
    assert.strictEqual(secondLink.kind, 'err', 'Вторая генерация ссылки должна вернуть ошибку');
    
    if (secondLink.kind === 'err') {
      assert.strictEqual(secondLink.error.message, 'Ссылка уже была сгенерирована или платёж в неверном состоянии');
    }
  }
});

test('Невозможно завершить платёж до генерации ссылки', () => {
  const createResult = Payment.create(100, 'RUB');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind === 'ok') {
    const payment = createResult.value;
    
    // Попытка завершить платёж без генерации ссылки
    const successResult = payment.succeed();
    assert.strictEqual(successResult.kind, 'err', 'Должна быть ошибка');
    
    if (successResult.kind === 'err') {
      assert.strictEqual(successResult.error.message, 'Платёж можно завершить только после действий клиента');
    }
  }
});

test('Восстановление платежа из истории событий', () => {
  // Создаём платёж и проводим его через несколько состояний
  const createResult = Payment.create(500, 'USD', 'Test payment');
  assert.strictEqual(createResult.kind, 'ok');
  
  if (createResult.kind === 'ok') {
    const originalPayment = createResult.value;
    originalPayment.generateLink('https://pay.example.com');
    
    // Получаем события
    const events = originalPayment.getEvents();
    assert.strictEqual(events.length, 2, 'Должно быть 2 события у платежа');
    
    // Восстанавливаем платёж из событий
    const reconstituteResult = Payment.reconstitute(events);
    assert.strictEqual(reconstituteResult.kind, 'ok', 'Восстановление должно быть успешным');
    
    if (reconstituteResult.kind === 'ok') {
      const restoredPayment = reconstituteResult.value;
      
      assert.strictEqual(restoredPayment.getId(), originalPayment.getId(), 'ID должен совпадать');
      assert.strictEqual(restoredPayment.getStatus(), 'link_ready', 'Статус должен быть восстановлен');
      assert.strictEqual(restoredPayment.getEvents().length, events.length, 'Количество событий должно совпадать');
      
      // Проверяем, что события в правильном порядке
      assert.strictEqual(restoredPayment.getEvents()[0].type, 'payment_initiated');
      assert.strictEqual(restoredPayment.getEvents()[1].type, 'payment_link_generated');
    }
  }
});

