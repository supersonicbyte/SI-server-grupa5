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
const { disconnect } = require('process');
const { json } = require('express');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// map of clients
const clients = [];
// map of responses {id, promise}
const responseMap = [];
// map of response messages//
const messageMap = [];//

wss.on('connection', function connection(ws) {
  ws.send(JSON.stringify({ type: "Connected" }));
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'sendCredentials') {

      const date = new Date()
      console.log("Client connected: " + "Client: " + message.name + " " + message.ip + " " + date.toUTCString());
      ws.name = message.name;
      ws.location = message.location;
      ws.ip = message.ip;
      ws.path = message.path;
      ws.status = "Online";
      clients[message.name + message.location + message.ip] = ws;
      responseMap[message.name + message.location + message.ip] = emptyPromise();
    }
    else if (message.type === "command_result") {
      messageMap[message.name + message.location + message.ip].message = message.message;//
      responseMap[message.name + message.location + message.ip].resolve(messageMap[message.name + message.location + message.ip]);
    } else if (message.type === "sendScreenshot") {
      messageMap[message.name + message.location + message.ip].message = message.message;//
      responseMap[message.name + message.location + message.ip].resolve(messageMap[message.name + message.location + message.ip]);
    } else if (message.type === "sendFile") {

      let buff = new Buffer.from(message.data, 'base64');

      let path = message.name + message.location + message.ip;
      let dir = './'+path;

          if (!fs.existsSync(dir)){
              fs.mkdirSync(dir);
          }
      fs.writeFile(path+"/"+message.fileName, buff, function (err) {
        if (err) {
          responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Error",message:"Error writing file"}));
          console.log("error: " + err)
        }
        else {
          responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Success",message:"File successfully written."}));
          console.log("done")
        }
      });
    } else if (message.type = "savedFile") {
      responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Success",message:"File saved on agent!"}));
   
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
  const { name, location, ip, command } = req.body;
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    var response = {
      type: "command",
      command: command,
      parameters: parameters
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, name, location, ip);
    responseMap[name + location + ip].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location + ip] = emptyPromise();

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

app.get('/api/agent/online', async (req, res) => { 
  var clientArray = [];
  
  for (let c in clients) {
    let client = clients[c];
    clientArray.push({ name: client.name, location: client.location, ip: client.ip, path:client.path,status:client.status })
  }

  res.send(clientArray)
});

app.post('/api/agent/disconnect', async (req, res) => {

  const { name, location, ip } = req.body;

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    
    var response = {
      type: "Disconnected"
    }
   ws.send(JSON.stringify(response));
   ws.status="Disconnected";
    res.statusCode = 200;
    res.json(response);
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

app.post('/api/agent/connect', async (req, res) => {
  const { name, location, ip } = req.body;

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    
    var response = {
      type: "Connected"
    }
    ws.status="Connected";
    ws.send(JSON.stringify(response));
    res.statusCode = 200;
    res.json(response);
  }
  else {
    var errResp = {
      error: "Device is not found!",
      name: name,
      location: location
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.post('/api/screenshot', async (req, res) => {
  const { name, location, ip } = req.body;
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    var response = {
      type: "getScreenshot",
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, name, location);
    responseMap[name + location + ip].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[name + location + ip] = emptyPromise();
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
      location: location,
      ip: ip
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});

app.post('/api/web/file/get', async (req, res) => {
  const { name, location, ip, fileName } = req.body;

  fs.readFile(name + location + ip + "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error!" });
    }
    else {
      var response = {
        fileName: fileName,
        base64Data: data
      }
      res.status = 200;
      res.send(response);
    }
  });
});

app.post('/api/web/file/put', async (req, res) => {
  const { name, location, ip, fileName, base64Data } = req.body;

  let buff = new Buffer.from(base64Data, 'base64');

  fs.writeFile(name + location + ip + "/" + fileName, buff, function (err) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error!" });
    }
    else {
      console.log("done");
      res.json({ message: "Done!" });
    }
  });
});

app.post('/api/agent/file/get', async (req, res) => {
  const { name, location, ip, fileName, path} = req.body;
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
     var response = {
         type: "getFile",
         fileName: fileName,
         path: path
     }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, name, location, ip); 
    responseMap[name + location + ip].then((val) => {
     clearTimeout(errorTimeout);
     responseMap[name + location + ip] = emptyPromise();
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
     location: location,
     ip: ip
   }
   res.statusCode = 404;
   res.json(errResp);
 }
 
});

app.post('/api/agent/file/put', async (req, res) => {
  const { name, location, ip, fileName, path} = req.body;
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
      fs.readFile(name + location + ip + "/" + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
          console.log("error: " + err)
          res.json({ error: "Error!" });
        }
        else {
          var response = {
            type: "putFile",
            fileName: fileName,
            path: path,
            base64Data: data
          }
          ws.send(JSON.stringify(response));
          const errorTimeout = setTimeout(errFunction, 10000, name, location, ip); 
          responseMap[name + location + ip].then((val) => {
            clearTimeout(errorTimeout);
            responseMap[name + location + ip] = emptyPromise();
            res.json(val);
          }).catch((err) => {
            res.statusCode = 404;
            res.json(err);
          });
        }
      }); 
  } else {
    var errResp = {
      error: "Device is not connected to the server!",
      name: name,
      location: location,
      ip: ip
    }
   res.statusCode = 404;
   res.json(errResp);
 } 
});

app.get('/', (req, res) => {
  res.send('<h1>Up and running.</h1>');
})

function errFunction(name, location, ip) {
  var errResp = {
    error: "Client took too long to respond",
    name: name,
    location: location,
    ip: ip
  }
  responseMap[name + location + ip].reject(errResp);
}



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Listening on port " + PORT));