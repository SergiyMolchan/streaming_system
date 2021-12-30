const connection = new WebSocket('ws://localhost:8080', 'json');
// todo: reserch https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/multiple/js/main.js
// web cam local
const localVideo = document.getElementById('local_video');

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
	let localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	localVideo.srcObject = localStream;
	localVideo.play();
	localStream.getTracks().forEach(track => {
		peerConnection.addTrack(track, localStream);
	});
	peerConnection.ontrack = async (event) => {
		console.log('ok')
		const [remoteStream] = event.streams;
		console.log('remoteStream', remoteStream)
		streamVideo.srcObject = remoteStream;
	};


	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);

	connection.addEventListener('message', async event => {
		const answer = JSON.parse(event.data);
		peerConnection.setRemoteDescription(answer);
		dataChannel.send('hello');
	});
})()