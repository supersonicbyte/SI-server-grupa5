const uniqueAuth = require('../unique/unique.js');
const WebSocketService = require('../ws/websocket-service.js')

async function websocketLogin(req, res, next) { // /login
    const uniqueId = req.body.id;
    const validation = await uniqueAuth.validateUniqueCode(uniqueId);
    if (validation.status != 200) {
        res.status(validation.status);
        res.send({ error: "Id not valid!" });
        console.log("Id not valid for " + uniqueId);
        return;
    } else {
        WebSocketService.addSession(uniqueId);
        res.status(validation.status);
        res.send({ message: 'Session updated' });
        console.log("Session updated ");
    }
    next();
}

module.exports.websocketLogin = websocketLogin;