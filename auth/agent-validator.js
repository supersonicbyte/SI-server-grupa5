const accessAuth = require('./access_auth.js');

async function agentValidator(req, res, next) { // /api/*/agent
    const { user, deviceUid } = req.body;
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