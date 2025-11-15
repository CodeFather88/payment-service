import { Elysia, type Context } from "elysia";
import { PaymentService } from "../../../application/PaymentService";
import { InMemoryEventStore } from "../../../infrastructure/InMemoryEventStore";

export const di = new Elysia({ name: "di" })
  .state("eventStore", new InMemoryEventStore())
  .decorate("paymentService", (ctx: Context & { eventStore: InMemoryEventStore }) => {
    return new PaymentService(ctx.eventStore);
  })
