const app = require('./app.js');
const runRTC = require('./rtc');
const {server: WebSocketServer} = require("websocket");
const { host, port } = { port: 8080, host: '127.0.0.1' };

(async () => {
	try {
		// http server
		app.listen(port, host, (error) => {
			if (error) throw error;
			// WebSocket server
			runRTC(new WebSocketServer({
				httpServer: app.server,
				autoAcceptConnections: false
			}));
		});

	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();