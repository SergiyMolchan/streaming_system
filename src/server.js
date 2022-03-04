const fastify = require('fastify');
const fastifyCookie = require('fastify-cookie');
const Ajv = require('ajv');
const path = require('path');
// const Redis = require("ioredis");
// const redis = new Redis([{
// 	port: 6379, // Redis port
// 	host: "127.0.0.1",
// }]);

// const redisSub = new Redis([{
// 	port: 6379, // Redis port
// 	host: "127.0.0.1",
// }]);
//
// redis.on('connect', () => {
// 	console.log('Redis connected');
// 	// redis.xadd("mystream", "*", "randomValue", 'adsadasd').then(() => {
// 	// 	redis.xread("block", 0, "STREAMS", "mystream", 0).then(data => console.log('redis stream', data)).catch(console.error)
// 	// })
// })
// redis.on('error', error => console.error(error))
// const channel = 'stream'
// redisSub.subscribe(channel, (err, count) => {
// 	if (err) {
// 		// Just like other commands, subscribe() can fail for some reasons,
// 		// ex network issues.
// 		console.error("Failed to subscribe: %s", err.message);
// 	} else {
// 		// `count` represents the number of channels this client are currently subscribed to.
// 		console.log(
// 			`Subscribed successfully! This client is currently subscribed to ${count} channels.`
// 		);
// 	}
// });

// const kafka = require('kafka-node');
// const topics = [{
// 	topic: 'topic-test',
// 	partitions: 100,
// 	replicationFactor: 1,
// }];
// const client = new kafka.KafkaClient({ kafkaHost: '127.0.0.1:9092' });
// // client.createTopics(topics,(error, result) => {
// // 	if (error) {
// // 		console.log('topic error', error)
// // 		return;
// // 	}
// // 	console.log('topic', result)
// // });
// const producer = new kafka.Producer(client);
// const consumer = new kafka.Consumer(client, [{	topic: 'topic-test' }], { autoCommit: true, fetchMaxBytes: 200000000 })
// producer.on('error', function (err) {
// 	console.log('producer error', err);
// });
//
// consumer.on('error', function (err) {
// 	console.log('consumer error', err);
// });

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

const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream, MediaStreamTrack } = require('wrtc');
const { RTCVideoSink, RTCVideoSource, RTCAudioSink, RTCAudioSource } = require('wrtc').nonstandard;

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

		peerConnection.ontrack = async  stream => {
			console.log('stream', stream);

			const remoteMediaStream = stream.streams[0];
			// mediaStream.addTrack(peerConnection.getTransceivers()[1].receiver.track)
			const videoSink = new RTCVideoSink(remoteMediaStream.getVideoTracks()[0]);
			const videoSource = new RTCVideoSource();
			const videoTrack = videoSource.createTrack()
			videoSink.onframe = ({ frame }) => {
				// console.log('frame',frame.data)
				// frame.data = Array.from(frame.data)
				// console.log('video frame', JSON.stringify(frame))
				// producer.send([{ topic: topics[0].topic, messages: [JSON.stringify(frame)] }], function (
				// 	err,
				// 	result
				// ) {
				// 	// console.log(err || result);
				// 	// process.exit();
				// });
				// redis.publish(channel, JSON.stringify(frame));
				videoSource.onFrame(frame)
			};
			// redisSub.on("message", (channelName, message) => {
			// 	const frame = JSON.parse(message)
			// 	frame.data = Uint8Array.from(frame.data)
			// 	videoSource.onFrame(frame)
			// });
			//
			// consumer.on('message', function (message) {
			// 	// console.log('message', JSON.parse(message.value));
			// 	const frame = JSON.parse(message.value)
			// 	frame.data = Uint8Array.from(frame.data)
			// 	videoSource.onFrame(frame)
			// });

			const audioSink = new RTCAudioSink(remoteMediaStream.getAudioTracks()[0])
			const audioSource = new RTCAudioSource();
			const audioTrack = audioSource.createTrack()
			audioSink.ondata = data => {
				// console.log('audio', data);
				// console.log('audio');
				audioSource.onData(data);
			};
			const mediaStream = new MediaStream();
			mediaStream.addTrack(audioTrack);
			mediaStream.addTrack(videoTrack);

			peerConnection.addTrack(audioTrack, mediaStream); // send stream
			peerConnection.addTrack(videoTrack, mediaStream); // send stream
		}

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