const fetch = require('node-fetch');
/**
 * Validates installation code
 */
async function validateInstallationCode(code) {
    const uniqueResponse = fetch(process.env.UNIQUE_URL, {
        method: 'post',
        body:    { "I_code": code }
    }).then(res => {
        console.log("uniqueResponse");
        return res;    
    });
    
    console.log(uniqueResponse);
    return uniqueResponse;
}


module.exports.validateInstallationCode = validateInstallationCode;