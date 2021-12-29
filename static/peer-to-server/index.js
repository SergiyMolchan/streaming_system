const connection = new WebSocket('ws://localhost:8080', 'json');
// todo: reserch https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/multiple/js/main.js
// web cam local
const localVideo = document.getElementById('local_video');
let streaming = false;

localVideo.addEventListener('canplay', () => {
	if (!streaming) streaming = true;
}, false);

async function enableWebCam({ videoElement }) {
	try {
		videoElement.srcObject = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
		videoElement.play();
	} catch (err) {
		console.log('enableVebCam error: ' + err);
	}
}

// stream video
// const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

const streamVideo = document.getElementById('streaming_video');

(async () => {
	const peerConnection = new RTCPeerConnection();
	peerConnection.onicecandidate = e => {
		const offer = peerConnection.localDescription;
		// console.log('icecandidate', JSON.stringify(offer));
		connection.send(JSON.stringify(offer));
	}

	const dataChannel = peerConnection.createDataChannel('test');
	dataChannel.onopen = () => console.log('data channel is opened')
	dataChannel.onerror = error => console.error('channel error: ', error)
	dataChannel.onmessage  = e => console.log('channel message: ', e.data)



	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);

	connection.addEventListener('message', event => {
		const answer = JSON.parse(event.data);
		peerConnection.setRemoteDescription(answer);
		dataChannel.send('hello');
	});

})()