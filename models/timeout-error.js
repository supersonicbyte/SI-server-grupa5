const Error = require('./error.js');
const WebSocketService = require('../ws/websocket-service.js');

function timeoutError(deviceUid) {
    try {
        const error = new Error(8,"Agent took too long to respond.");
        WebSocketService.setErrorOnResposneForDevice(deviceUid, error);
    } catch (err) {
        console.log("errFunction error " + err);
    }
}

module.exports.timeoutError = timeoutError;