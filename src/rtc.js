const { server: WebSocketServer } = require("websocket");
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream, MediaStreamTrack } = require('wrtc');
const { RTCVideoSink, RTCVideoSource, RTCAudioSink, RTCAudioSource } = require('wrtc').nonstandard;

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

async function messageHandler({ message, connection }) {
    const data = JSON.parse(message);
    // console.log('message', data);

    const offer = data;
    const peerConnection = new RTCPeerConnection();

    peerConnection.ontrack = async  stream => {
        console.log('stream', stream);

        const remoteMediaStream = stream.streams[0];
        // media-stream.addTrack(peerConnection.getTransceivers()[1].receiver.track)
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

}

function closeConnectionHandler(reasonCode, description) {
    console.log((new Date()) + ' Peer disconnected.');

    // console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
}

function requestHandler(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    const connection = request.accept('json', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', message => messageHandler({
        message: message.utf8Data, connection
    }));
    connection.on('close', closeConnectionHandler);
}

function runRTC(ws) {

    ws.on('request', requestHandler);
}

module.exports = runRTC;