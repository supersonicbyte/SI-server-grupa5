
const auth = require('./auth/auth.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());
const cors = require('cors')
const emptyPromise = require('empty-promise')
const WebSocket = require('ws');
// web socket server
const wss = new WebSocket.Server({ server:server });
// cross origin
app.use(cors());

const fetch = require('node-fetch');

// map of clients
const clients = [];
// map of responses {id, promise}
const responseMap = [];
//
 
wss.on('connection', function connection(ws){
    console.log("Client connected ");
    ws.send("Connected");
    ws.on('message',  (message) =>{
    message = JSON.parse(message);
    //kada primi inicijalnu prvu poruku, taj remote PC pošalje svoje ime i lokaciju, to se spremi u mapu (name + lokacija je unikatno kako u bazi tako će i ovdje biti pa možemo pod tim šifrirati)
    if(message.type === 'sendCredentials') { //ovo je prva poruka koju klijent pošalje prilikom prvog javljanja
        clients[message.name + message.location] = ws;
        responseMap[message.name+message.location] = emptyPromise(); //kreiraj prazan promise koji se moze resolvat kad mi hoćemo
    } 
    else 
    {
        var tempResp = {
            status : message.type,
        }
        responseMap[message.name + message.location].resolve(tempResp) //klijent taj i taj je odgovorio sa nekom porukom tako da možemo resolve-ati njegov promise (odnosno idemo u 72 liniju koda!)
    }
});
 
});

function errFunction(name,location)
{
    console.log("ovo se smije ispisati u konzoli samo ako bude neki error!");
    var errResp = {
        status : "execution failed",
        name : name,
        location : location
    }
    responseMap[name + location].reject(errResp);
}

/** POST request for executing command on remote machine
 * {
 *  name: "mirza-pc",
 *  location: "Sarajevo",
 *  command: "mkdir folder"
 * }
 */
app.post('/command', async(req,res) => {

  const {name, location, command} = req.body;
  
  const authHeader = req.headers.authorization;

  //console.log(authHeader);

  //Potrebno AUTH uraditi sa grupom 6

   const tokenStatus = await auth.validateJWT(authHeader);

   console.log(tokenStatus);

   if(tokenStatus!= 200 ){
     res.status(tokenStatus);
     res.send("Token not valid");
     return;
   }

  let ws = clients[name + location];
  if(ws!== undefined)
  {

    ws.send(command); // ako dati PC je konektovan na server, pošalji mu komandu!

    var errorTimeout = setTimeout(errFunction, 10000, name, location); //sigurnosni timeout koji će rejectati gore navedeni promise u slučaju da ne dođe odgovor unutar 10sekundi
  
    responseMap[name + location].then((val) => { //startaj taj prazan promise koji je kreiran pri prvoj konekciji Remote PC-a (čekaj na odgovor klijenta)
      clearTimeout(errorTimeout);
      responseMap[name + location] = emptyPromise();
      res.json(val);
    }).catch((err)=>{
        res.statusCode=404;
        res.json(err);
    });


  }
  else
  {
    var errResp = {
        status : "device is not connected to the server!",
        name : name,
        location : location
    }
    res.statusCode=404;
    res.json(errResp);
  }
});



const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log("Listening on port " + PORT));