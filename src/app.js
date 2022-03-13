const fastify = require("fastify");
const fastifyCookie = require("fastify-cookie");
const path = require("path");
const Ajv = require("ajv");

const app = fastify({
    logger: true,
    ajv: {
        customOptions: {
            removeAdditional: true,
            useDefaults: true,
            coerceTypes: true,
            allErrors: false,
            nullable: true,
        },
    },
});

app.register(fastifyCookie, { secret: 'sdfsdf' });
app.register(require('fastify-static'), {
    root: path.join(process.cwd(), 'static', 'peer-to-server'),
    prefix: '/'
});

// define validators
const ajv = new Ajv();

app.setValidatorCompiler(schema => ajv.compile(schema));

app.setErrorHandler(function (error, request, reply) {
    if (error.validation) {
        const errors = error.validation;
        // @ts-ignore
        const errorMessage = errors.reduce((message, error) => message += `${error.message} `, '');
        reply.status(400).send({
            success: false,
            message: errorMessage
        });
    }
});

module.exports = app;