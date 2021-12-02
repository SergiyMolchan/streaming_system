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
const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
async function createConnection() {
	const peerConnection = new RTCPeerConnection(
		configuration
		// {
		// 	iceServers: [     // Information about ICE servers - Use your own!
		// 		{
		// 			urls: 'turn:' + window.location.hostname,  // A TURN server
		// 			username: 'webrtc',
		// 			credential: 'turnserver'
		// 		}
		// 	]
		// }
	);
	const offer = await peerConnection.createOffer();
	console.log('offer', offer);
	await peerConnection.setLocalDescription(offer);
	return { offer, peerConnection };
}

async function acceptCall(offer) {
	const peerConnection = new RTCPeerConnection(
		configuration
		// {
		// 	iceServers: [     // Information about ICE servers - Use your own!
		// 		{
		// 			urls: 'turn:' + window.location.hostname,  // A TURN server
		// 			username: 'webrtc',
		// 			credential: 'turnserver'
		// 		}
		// 	]
		// }
	);

	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
	const answer = await peerConnection.createAnswer();
	console.log('answer', answer);
	await peerConnection.setLocalDescription(answer);
	return { answer, peerConnection };
}

const streamVideo = document.getElementById('streaming_video');

(async () => {
	enableWebCam({ videoElement: localVideo });
	// const { offer, peerConnection: peerConnection1 } = await createConnection();
	// const { answer, peerConnection: peerConnection2 } = await acceptCall(offer);
	// const remoteDesc = new RTCSessionDescription(answer);
	// console.log('remoteDesc', remoteDesc);
	// await peerConnection1.setRemoteDescription(remoteDesc);
	// peerConnection1.addEventListener('icecandidate', event => {
	// 	console.log('ok');
	// 	if (event.candidate) {
	// 		console.log('peerConnection1 event.candidate', event.candidate);
	// 	}
	// });
	// peerConnection2.addEventListener('icecandidate', event => {
	// 	if (event.candidate) {
	// 		console.log('peerConnection2 event.candidate', event.candidate);
	// 	}
	// });

	connection.onopen = socket => {
		let peers = {};
		let pendingCandidates = {};
		// let localStream;

		let createPeerConnection = () => {
			const pc = new RTCPeerConnection({});
			pc.onicecandidate = onIceCandidate;
			pc.onaddstream = onAddStream;
			// pc.addStream(localStream);
			console.log('PeerConnection created');
			return pc;
		};

		let sendOffer = (sid) => {
			console.log('Send offer');
			peers[sid].createOffer().then(
				(sdp) => setAndSendLocalDescription(sid, sdp),
				(error) => {
					console.error('Send offer failed: ', error);
				}
			);
		};

		let sendAnswer = (sid) => {
			console.log('Send answer');
			peers[sid].createAnswer().then(
				(sdp) => setAndSendLocalDescription(sid, sdp),
				(error) => {
					console.error('Send answer failed: ', error);
				}
			);
		};

		let setAndSendLocalDescription = (sid, sessionDescription) => {
			peers[sid].setLocalDescription(sessionDescription);
			console.log('Local description set');
			connection.send(JSON.stringify({ sid, type: sessionDescription.type, sdp: sessionDescription.sdp }));
		};

		let onIceCandidate = (event) => {
			if (event.candidate) {
				console.log('ICE candidate');
				connection.send(JSON.stringify({
					type: 'candidate',
					candidate: event.candidate
				}));
			}
		};

		let onAddStream = (event) => {
			console.log('Add stream');
			const newRemoteStreamElem = document.createElement('video');
			newRemoteStreamElem.autoplay = true;
			newRemoteStreamElem.srcObject = event.stream;
			document.querySelector('#remoteStreams').appendChild(newRemoteStreamElem);
		};

		let addPendingCandidates = (sid) => {
			if (sid in pendingCandidates) {
				pendingCandidates[sid].forEach(candidate => {
					peers[sid].addIceCandidate(new RTCIceCandidate(candidate));
				});
			}
		};

		let handleSignalingData = (data) => {
			// let msg = JSON.parse(data);
			console.log(data);
			const sid = data.sid;
			delete data.sid;
			switch (data.type) {
				case 'offer':
					peers[sid] = createPeerConnection();
					peers[sid].setRemoteDescription(new RTCSessionDescription(data));
					sendAnswer(sid);
					addPendingCandidates(sid);
					break;
				case 'answer':
					peers[sid].setRemoteDescription(new RTCSessionDescription(data));
					break;
				case 'candidate':
					if (sid in peers) {
						peers[sid].addIceCandidate(new RTCIceCandidate(data.candidate));
					} else {
						if (!(sid in pendingCandidates)) {
							pendingCandidates[sid] = [];
						}
						pendingCandidates[sid].push(data.candidate);
					}
					break;
			}
		};

		connection.onmessage = async message => {
			console.log('message.data', message.data);
			message = JSON.parse(message.data);
			handleSignalingData(message);
		};
		peers[socket.timeStamp] = createPeerConnection();
		sendOffer(socket.timeStamp);
		addPendingCandidates(socket.timeStamp);
	};

})();
