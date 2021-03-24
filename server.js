
const auth = require('./auth/auth.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());
const cors = require('cors')
const emptyPromise = require('empty-promise')
const env = require('dotenv');
const WebSocket = require('ws');
const fs = require("fs")
// web socket server
const wss = new WebSocket.Server({ server: server });
// cross origin
app.use(cors());
// setup env
env.config()
const fetch = require('node-fetch');

const swaggerUi = require('swagger-ui-express'),
swaggerDocument = require('./swagger.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// map of clients
const clients = [];
// map of responses {id, promise}
const responseMap = [];
// map of response messages//
const messageMap = [];//

wss.on('connection', function connection(ws) {
  ws.send("Connected");
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'sendCredentials') {
      const date = new Date()
      console.log("Client connected: " + "Client: " + message.name + " " + date.toUTCString());
      clients[message.name + message.location] = ws;
      responseMap[message.name + message.location] = emptyPromise(); 
    }
    else if (message.type === "command_result"){
      messageMap[message.name + message.location].message = message.message;//
      responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
    } else if (message.type === "sendScreenshot"){
      messageMap[message.name + message.location].message = message.message;//
      responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
    } else if (message.type === "sendFile") {
      //messageMap[message.name + message.location].message = message.message;//

      console.log("I got a file to write "+message.fileName);
 
      let buff = new Buffer.from(message.data, 'base64');
 
      fs.writeFile(message.fileName, buff,  function (err) {
          if (err) {
              console.log("error")
          }
          else {
              console.log("done")
          }
      });
     // responseMap[message.name + message.location].resolve(messageMap[message.name + message.location]);
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
    var response = {
      type: "command",
      command: command,
      parameters: parameters
    }
  ws.send(JSON.stringify(response));
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
    var response = {
      type: "getScreenshot",
    }
  ws.send(JSON.stringify(response));
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

 /*app.post('/api/file', async (req, res) => {
  const { name, location, file_name, path} = req.body;
  let ws = clients[name + location];
  if (ws !== undefined) {
      var response = {
          type: "getFile",
          file_name: file_name,
          path: path
      }
    ws.send(JSON.stringify(response));
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
});*/

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



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Listening on port " + PORT));