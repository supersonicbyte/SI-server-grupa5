const fetch = require('node-fetch');
/**
 * Validates installation code
 */
let ayatoken ="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJhYXlpxIdAYXlhLmNvbSIsInJvbGVJZCI6MiwiZ3JvdXBJZCI6bnVsbCwiaWF0IjoxNjE3NDUzMjY2LCJleHAiOjE2MjE3NzMyNjZ9.0fvl4a_MUPOLSspNculgXvnq7ZoddKAcP6mkc6kf5Eo"
async function validateUniqueCode(id) {
    const uniqueResponse = fetch(process.env.UNIQUE_URL+id, {
        headers: { "Authorization": ayatoken }
    }).then(res => {
       // console.log("uniqueResponse");
        return res;    
    });
    
    //console.log(uniqueResponse);
    return uniqueResponse;
}


module.exports.validateUniqueCode = validateUniqueCode;