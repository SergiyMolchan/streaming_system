const fastify = require('fastify');
const fastifyCookie = require('fastify-cookie');
const Ajv = require('ajv');

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

// define routes
// app.route(userRoutes.registrationRoute);


const { host, port } = { port: 8080, host: '127.0.0.1' };

(async () => {
	try {
		console.log(`Server running on ${host}:${port}`);
		await app.listen(port, host);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
