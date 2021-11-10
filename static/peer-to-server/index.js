const connection = new WebSocket('ws://localhost:8080', 'json');

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

const rtcPeerConnection = new RTCPeerConnection({
	iceServers: [     // Information about ICE servers - Use your own!
		{
			urls: 'turn:' + window.location.hostname,  // A TURN server
			username: 'webrtc',
			credential: 'turnserver'
		}
	]
});

rtcPeerConnection.onicecandidate = event => {
	const connectData = {
		type: 'new-ice-candidate',
		target: 's',
		candidate: event.candidate
	};
	connection.send(JSON.stringify(connectData));
};

const offer = rtcPeerConnection.createOffer();


const streamVideo = document.getElementById('streaming_video');

(async () => {
	enableWebCam({ videoElement: localVideo });
})();
