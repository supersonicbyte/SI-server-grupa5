const fetch = require('node-fetch');
/**
 * Validates installation code
 */
async function validateUniqueCode(id) {
    const uniqueResponse = fetch(process.env.DEVICE_URL+id, {
        
    }).then(res => {
        return res;    
    });
    
    return uniqueResponse;
}


module.exports.validateUniqueCode = validateUniqueCode;