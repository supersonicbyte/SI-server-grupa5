
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
      const commandResponse = 
      {
        command_result: message.message,
      }
      responseMap[message.name + message.location].resolve(commandResponse);
    }
  });

});
// validator for all /api routes, checks if token is valid
app.use('/api', async function (req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenStatus = await auth.validateJWT(authHeader);
  if (tokenStatus != 200) {
    res.status(tokenStatus);
    res.send("Token not valid");
    return;
  }
  next()
})

/** POST request for executing command on remote machine
 * {
 *  name: "mirza-pc",
 *  location: "Sarajevo",
 *  command: "mkdir folder"
 * }
 */
app.post('/api/command', async (req, res) => {
  const { name, location, command } = req.body;
  let ws = clients[name + location];
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



const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log("Listening on port " + PORT));