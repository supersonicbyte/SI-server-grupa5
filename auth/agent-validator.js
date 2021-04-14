const accessAuth = require('./access_auth.js');
const Error = require('../models/error.js');
const WebSocketService = require('../ws/websocket-service.js');
const {promiseStatus} = require('promise-status-async');

async function agentValidator(req, res, next) {
    const { user, deviceUid } = req.body;
    console.log("evo nas");
    let response = WebSocketService.getResponsePromiseForDevice(deviceUid);
    //console.log(response);
    let status = await promiseStatus(response);
    console.log("status " + status);
     if (status === "pending") {
        res.status(400);
        let error = {
            success: false,
            message: "Agent in use."
        }
        res.send(error);
        return;
     }

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