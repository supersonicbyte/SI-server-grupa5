
const fetch = require('node-fetch');
/**
 * Validates token
 */
async function validateUserAccess(token,deviceUid) {
    const tokenResponse = fetch(process.env.AUTH_URL+deviceUid, {
        headers: { "Authorization": token }
    }).then(res => {
        return res;    
    });
    
    return tokenResponse;
}


module.exports.validateUserAccess = validateUserAccess;