const fastify = require('fastify');
const fastifyCookie = require('fastify-cookie');
const Ajv = require('ajv');
const path = require('path');

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

// define routes
// app.route({
// 	method: 'GET',
// 	url: '/',
// 	handler: (req, reply) => {
// 		try {
// 			reply.sendFile('index.html', { cacheControl: false });
// 		} catch (e) {
// 			console.error(e);
// 			reply.code(500).send(e);
// 		}
// 	}
// });

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


// webSocket server
const WebSocketServer = require('websocket').server;
const ws = new WebSocketServer({
	httpServer: app.server,
	autoAcceptConnections: false
});

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;
}

const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('wrtc');

ws.on('request', function (request) {
	if (!originIsAllowed(request.origin)) {
		// Make sure we only accept requests from an allowed origin
		request.reject();
		console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
		return;
	}

	const connection = request.accept('json', request.origin);
	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', async message => {
		const data = JSON.parse(message.utf8Data);
		// console.log('message', data);

		const offer = data;
		const peerConnection = new RTCPeerConnection();
		peerConnection.onicecandidate = e => {
			const answer = peerConnection.localDescription;
			// console.log('icecandidate', JSON.stringify(answer));
			connection.send(JSON.stringify(answer));
		}
		await peerConnection.setRemoteDescription(offer);

		let dataChannel;
		peerConnection.ondatachannel = e => {
			dataChannel = e.channel
			dataChannel.onopen = () => console.log('data channel is opened')
			dataChannel.onerror = error => console.error('channel error: ', error)
			dataChannel.onmessage  = e => console.log('channel message: ', e.data)
		}

		// await peerConnection.addIceCandidate({});
		const answer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(answer);
	});
	connection.on('close', function (reasonCode, description) {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
	});
});