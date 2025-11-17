import { Elysia } from "elysia";
import { PaymentService } from "../../../application/PaymentService";
import { InMemoryEventStore } from "../../../infrastructure/InMemoryEventStore";
import { env } from "../../../configs";

/**
 * DI контейнер создает синглтоны для всего приложения, но можно использовать сторонние либы для организации DI
 */
const eventStore = new InMemoryEventStore();
const paymentService = new PaymentService(eventStore, env.paymentLinkDomain);

/**
 * DI плагин для внедрения зависимостей
 */
export const di = new Elysia({ name: "di" })
	.decorate("eventStore", eventStore)
	.decorate("paymentService", paymentService);

/**
 * Тип для извлечения декораторов из плагина
 */
export type DIDecorators = {
	eventStore: InMemoryEventStore;
	paymentService: PaymentService;
};
