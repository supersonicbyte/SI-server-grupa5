const fetch = require('node-fetch');
/**
 * Validates installation code
 */
async function validateUniqueCode(id) {
    const uniqueResponse = fetch(process.env.UNIQUE_URL+id, {
    }).then(res => {
        console.log("uniqueResponse");
        return res;    
    });
    
    console.log(uniqueResponse);
    return uniqueResponse;
}


module.exports.validateUniqueCode = validateUniqueCode;