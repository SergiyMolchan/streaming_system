const { RTCVideoSource, RTCVideoSink } = require('wrtc').nonstandard;

const source = new RTCVideoSource();
const track = source.createTrack();
console.log(track)
const sink = new RTCVideoSink(track);

const width = 320;
const height = 240;
const data = new Uint8ClampedArray(width * height * 1.5);
const frame = { width, height, data };

const interval = setInterval(() => {
    // Update the frame in some way before sending.
    source.onFrame(frame);
});

sink.onframe = ({ frame }) => {
    // Do something with the received frame.
    // console.log('frame',frame)
};

setTimeout(() => {
    clearInterval(interval);
    track.stop();
    sink.stop();
}, 10000);