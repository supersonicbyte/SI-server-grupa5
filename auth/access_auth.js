
const fetch = require('node-fetch');
const Error = require('../models/error.js');
/**
 * Validates token
 */
async function validateUserAccess(token,deviceUid) {
    let route = process.env.UNIQUE_URL+deviceUid;
    const tokenResponse = fetch(route, {
        headers: { "Authorization": token }
    }).then(res => {
        return res;    
    });
    return tokenResponse;
}


module.exports.validateUserAccess = validateUserAccess;