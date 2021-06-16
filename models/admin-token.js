
const fetch = require('node-fetch');

let adminToken = null;

async function getAdminToken(deviceUid) {

    if(adminToken!=null)return adminToken;
    try {
        
        const uniqueResponse =await fetch(process.env.ADMIN_TOKEN_URL, {
            headers: {
                'Content-Type': 'application/json',
              },
            method: 'POST',
            body: JSON.stringify({email:'aayić@aya.com',password:'sifraABC'})
            
        }).then(response => response.json())
        .then(data => {
          adminToken = data.accessToken;
          return adminToken;
        });
        console.log("Returning the token");
        return uniqueResponse;
       
 


    } catch (err) {
        console.log("errFunction error " + err);
    }
}

module.exports.getAdminToken = getAdminToken;