const accessAuth = require('./access_auth.js');
const Error = require('../models/error.js');
const WebSocketService = require('../ws/websocket-service.js');
const {promiseStatus} = require('promise-status-async');

async function agentValidator(req, res, next) {
    const { user, deviceUid } = req.body;

    let ws = WebSocketService.getClients()[deviceUid];
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        res.json(error);
        return;
    }
     if (ws.busy) {
        res.status(400);
        const error = new Error.Error(10, "Agent already in use");
        res.send(error);
        return;
     }
    clients[deviceUid].busy = true;
    const authHeader = req.headers.authorization;
    const validation = await accessAuth.validateUserAccess(authHeader, deviceUid);
    if (validation.status != 200) {
        res.status(validation.status);
        const error = new Error.Error(5, "Not authorized");
        res.send(error);
        return;
    }
    next();
}

module.exports.agentValidator = agentValidator;