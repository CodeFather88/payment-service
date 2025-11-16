import envSchema, { JSONSchemaType } from 'env-schema';

interface Env {
    APP_PORT: string;
    PAYMENT_LINK_DOMAIN: string;
}

const schema: JSONSchemaType<Env> = {
    type: 'object',
    required: [
        'APP_PORT',
        'PAYMENT_LINK_DOMAIN'
    ],
    properties: {
        APP_PORT: { type: 'string' },
        PAYMENT_LINK_DOMAIN: { type: 'string' }
    },
};

const config = envSchema({
    schema,
    dotenv: true
});

export default {
    app: {
        port: config.APP_PORT,
    },
    paymentLinkDomain: config.PAYMENT_LINK_DOMAIN
} as const;
