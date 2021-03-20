
const fetch = require('node-fetch');
/**
 * Validates token
 */
async function validateJWT(token) {
    const tokenResponse = fetch(process.env.AUTH_URL, {
        headers: { "Authorization": token }
    }).then(res => {
        return res;    
    });
    
    return tokenResponse;
}


module.exports.validateJWT = validateJWT;