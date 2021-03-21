
const auth = require('./auth/auth.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());
const cors = require('cors')
const emptyPromise = require('empty-promise')
const env = require('dotenv');
const WebSocket = require('ws');
// web socket server
const wss = new WebSocket.Server({ server: server });
// cross origin
app.use(cors());
// setup env
env.config()
const fetch = require('node-fetch');


// map of clients
const clients = [];
// map of responses {id, promise}
const responseMap = [];
// map of response messages//
const messageMap = [];//

wss.on('connection', function connection(ws) {
  ws.send("Connected");
  console.log("Client connected: " + Date.now().toString());
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'sendCredentials') { 
      clients[message.name + message.location] = ws;
      responseMap[message.name + message.location] = emptyPromise(); 
    }
    else if (message.type === "command_result"){
      messageMap[message.name + message.location].message = message.message;//
      responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
    } else if (message.type === "sendScreenshot"){
      messageMap[message.name + message.location].message = message.message;//
      responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
    }
  });

});
// validator for all /api routes, checks if token is valid
app.use('/api', async function (req, res, next) {
  const { name, location, command } = req.body;
  const authHeader = req.headers.authorization;
  const validation = await auth.validateJWT(authHeader);
  if (validation.status != 200) {
    res.status(validation.status);
    res.send("Token not valid");
    return;
  }else{
    var x=await validation.json();

    const messageResponse = //
      {
        token: x.accessToken,//
        message : ""//
      }
     messageMap[name+location] = messageResponse;//

  }
  
  next();
});

app.post('/api/command', async (req, res) => {
  const { name, location, command } = req.body;
  let ws = clients[name + location];
 // console.log("Dobio sam komandu "+name+" "+location+" "+command)
  if (ws !== undefined) {
    ws.send(command);
    const errorTimeout = setTimeout(errFunction, 10000, name, location); 
    responseMap[name + location].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location] = emptyPromise();
     
      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.post('/api/screenshot', async (req, res) => {
  const { name, location } = req.body;
  let ws = clients[name + location];
  //console.log("Dobio sam screen request "+name+" "+location);
  if (ws !== undefined) {

    ws.send("getScreenshot");
    const errorTimeout = setTimeout(errFunction, 10000, name, location); 
    responseMap[name + location].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location] = emptyPromise();
      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.get('/', (req, res) => {
  res.send('<h1>Up and running.</h1>');
})

function errFunction(name, location) {
  var errResp = {
    error: "Client took too long to respond",
    name: name,
    location: location
  }
  responseMap[name + location].reject(errResp);
}



const PORT = process.env.PORT || 25565;
server.listen(PORT, () => console.log("Listening on port " + PORT));