
const fetch = require('node-fetch');



   async function validateJWT(token){

    const returnValue =fetch('http://167.99.244.168:3333/jwt/verify', {

       headers: {"Authorization" : token}
       }).then(res => {  
           console.log(token);
           return res.status;   
       });
       return returnValue;
       

   }


   module.exports.validateJWT = validateJWT;