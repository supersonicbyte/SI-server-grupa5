const accessAuth = require('./access_auth.js');
const Error = require('../models/error.js');
const WebSocketService = require('../ws/websocket-service.js');
const {promiseStatus} = require('promise-status-async');

async function agentValidator(req, res, next) {
    
    if( process.env.DEBUG === 'true'){
        next();
        return;
    }

    const {deviceUid}  = req.body;
   
    const authHeader = req.headers.authorization;
    const validation = await accessAuth.validateUserAccess(authHeader, deviceUid);
    if (validation.status != 200) {
        res.status(validation.status);
        const error = new Error.Error(5, "Not authorized");
        console.log("Token:\n"+authHeader+"\n"+deviceUid);
        res.send(error);
        return;
    }

    next();
}

module.exports.agentValidator = agentValidator;