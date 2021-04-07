const auth = require('./auth.js');
const Error = require('../models/error.js');
const WebSocketService = require('../ws/websocket-service.js');

async function apiValidator(req, res, next) {
    const { deviceUid, command } = req.body;
    const authHeader = req.headers.authorization;
    const validation = await auth.validateJWT(authHeader);
    if (validation.status != 200) {
        res.status(validation.status);
        const error = new Error.Error(1,"Token not valid");
        res.send(error);
        return;
    } else {
        const x = await validation.json();
        const messageResponse =
        {
            token: x.accessToken, 
            message: "" 
        }
        WebSocketService.setMessageResponseForDevice(deviceUid, messageResponse);
    }
    next();
}

module.exports.apiValidator = apiValidator;