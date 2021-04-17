const auth = require('./auth.js');
const Error = require('../models/error.js');
const User = require('../models/user.js');
const WebSocketService = require('../ws/websocket-service.js');
const { json } = require('express');

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
        const result = await validation.json();
        const messageResponse =
        {
            token: result.accessToken, 
            message: "" 
        }
        WebSocketService.setMessageResponseForDevice(deviceUid, messageResponse);
        req.user =new User.User(result.id,result.email);
    }
    
    next();
}

module.exports.apiValidator = apiValidator;