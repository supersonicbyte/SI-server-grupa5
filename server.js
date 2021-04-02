const auth = require('./auth/auth.js');
const unique = require('./unique/unique.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());
const cors = require('cors')
const emptyPromise = require('empty-promise')
const env = require('dotenv');
const WebSocket = require('ws');
const fs = require("fs")
const uuid = require('uuid');
const session = require('express-session');
var dateFormat = require("dateformat");
// web socket server
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
// cross origin
app.use(cors());
app.use(express.static('public'));
// setup env
env.config()
const fetch = require('node-fetch');
const dirTree = require("directory-tree");

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

const DELAY = 300000; // In ms

const date = new Date();

const mainFolder = "allFiles";

const interval = setInterval(async () => {
  for(k in clients) {

    if(clients[k]==undefined)continue;
    
    if(clients[k].status === "Disconnected") {
      clients[k].send('{"type":"Disconnected", "user":"Server"}');
      return clients[k].terminate();
    }

    clients[k].status = "Disconnected";
    clients[k].send('{"type":"ping", "user":"Server"}');
  }
}, DELAY);

const sessionParser = session({
  saveUninitialized: false,
  secret: '$eCuRiTy',
  resave: false,
  cookie: {secure: true, maxAge: null, httpOnly: false}
});

app.use(sessionParser);
const map = new Map();

app.post('/login', async function (req, res, next) {
  const uniqueId = req.body.id;
  const validation = await unique.validateUniqueCode(uniqueId);
  if (validation.status != 200) {
    res.status(validation.status);
    res.send({error: "Id not valid!"});
    return;
  } else {
    const id = await uuid.v4();
    //const id = "test";
    console.log(`Updating session for user ${id}`);
    req.session.userId = id;
    res.cookie("uid",id);
    //console.log(req.session.userId);
    res.status(validation.status);
    res.send({message: 'Session updated' });
  }
  next();
});

server.on('upgrade', function (request, socket, head) {
  console.log('Parsing session from request...');
  sessionParser(request, {}, () => {
    //console.log(request);
    console.log(head);
    if (!request.cookie.userId) {
      console.log("tu sam");
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log('Session is parsed!');

    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', function connection(ws, request) {
  const userId = request.session.userId;

  map.set(userId, ws);
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'sendCredentials') {

      if(clients[message.name+message.location+message.ip]!=undefined){

        ws.send('{"type":"Error", "message":"Already connected"}');
        ws.close();
        return;

      }

      console.log("Client connected: " + "Client: " + message.name + " "+message.location+" " + message.ip + " " + date.toUTCString());
      ws.name = message.name;
      ws.location = message.location;
      ws.ip = message.ip;
      ws.path = message.path;
     // ws.unique=uniqueCode;
      ws.status = "Waiting";
      ws.send(JSON.stringify({ type: "Connected" })); 
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
      
      
      let buff = new Buffer.from(message.config, 'base64');

      let path = message.name + message.location + message.ip;
      let dir = mainFolder+ "/" +path;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
 
      // let fileName=message.fileName; ako trebao datum
      if(message.fileName==="config.json"){  

        dir = dir+"/config";
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
       // fileName="/config"+"31.3.2021"+".json"; //  ako bude datum trebao
        path= path + "/config";
       
      } 

      fs.writeFile("allFiles/"+path+"/"+message.fileName, buff, function (err) {
        if (err) {
          responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Error",message:"Error writing file"}));
          console.log("error: " + err)
        }
        else {
          responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Success",message:"File successfully written."}));
          console.log("done")
        }
      });
    } else if (message.type === "savedFile") {
      responseMap[message.name + message.location+message.ip].resolve(JSON.stringify({type:"Success",message:"File saved on agent!"}));
   
    } else if (message.type === "pong") {
      console.log(ws.name+" ponged");
      ws.status = "Online";
    }
  });

  ws.on('close',() =>{

    
    let id = ws.name+ws.location+ws.ip;

    let socket = clients[id];

    if(socket == undefined)return;

    console.log(socket.name+socket.location+socket.ip+" has gone offline");

    var errResp = {
      error: "Device couldnt respond!",
      name: ws.name,
      location: ws.location,
      ip: ws.ip
    }
    responseMap[id].status=400;
    responseMap[id].resolve(errResp);
    clients[id]=undefined;

  });

});

// validator for all /api routes, checks if token is valid
app.use('/api', async function (req, res, next) {
  const { name, location, command,ip } = req.body;
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
     messageMap[name+location+ip] = messageResponse;//

  }
  next();
});
 


app.post('/api/command', async (req, res) => {
  const { name, location, ip, command,parameters ,user} = req.body;
  if(name == undefined || location == undefined ||ip == undefined ||command == undefined ||parameters == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    if( (clients[name + location + ip].status == "In use" && clients[name + location + ip].user != user) ||clients[name+location+ip].status == "Waiting") {
      var errResp = {
        error: "Agent in use by another user!",
        name: name,
        location: location
      }
      if(clients[name+location+ip].status=="Waiting")errResp.error="You are not connected to that Agent!";
      res.statusCode = 404;
      res.json(errResp);
      return;
    }
    var response = {
      type: "command",
      command: command,
      user:user,
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

  const { name, location, ip,user } = req.body;
  if(name == undefined || location == undefined ||ip == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    
    if(clients[name+location+ip].status=="In use" && clients[name+location+ip].user != user){

      var errResp = {
        error: "You are not connected to that user!"
      }
      res.statusCode = 404;
      res.json(errResp);
      return;

    }


    var response = {
      type: "Waiting",
      user:user,
      message:"User successfully disconnected!"
    }
   ws.send(JSON.stringify(response));
   ws.status="Waiting";
   ws.user = "";
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
  const { name, location, ip,user } = req.body;

  if(name == undefined || location == undefined ||ip == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }

  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    if(ws.status === "In use") {
      var errResp = {
        error: "Device is already in use!",
        name: name,
        location: location
      }
      if(ws.user == user )errResp.error = "You are already connected to this user!";
      res.statusCode = 404;
      res.json(errResp);
      return;
    }
    else {
        var response = {
        type: "In use",
        user:user,
        message: "Connection successful!"
      }
      ws.status="In use";
      ws.user = user;
      ws.send(JSON.stringify(response));
      res.statusCode = 200;
      res.json(response);
    }
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
  const { name, location, ip,user } = req.body;
  if(name == undefined || location == undefined ||ip == undefined || user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    var response = {
      type: "getScreenshot",
      user:user
    }
    ws.send(JSON.stringify(response));
    console.log("I sent it to them");
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

app.post('/api/web/user/file/get', async (req, res) => { //user uzima svoj file sa servera
  const { fileName,user } = req.body;

  if(fileName == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let putanja="allFiles/" +user;

  fs.readFile(putanja+ "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error, no such file!" });
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

app.post('/api/web/agent/file/get', async (req, res) => { //user trazi file sa servera koji pripada nekoj masini(agentu)
  const { name, location, ip, fileName,user } = req.body;

  if(name == undefined || location == undefined || ip == undefined || fileName == undefined || user == undefined ){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let path="allFiles/" + name + location + ip;

  if(fileName === "config.json"  )
    path= path + "/config";

  fs.readFile(path + "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error, no such file!" });
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

app.post('/api/web/user/file/put', async (req, res) => {  //spasavanje user file-ova na server od strane web-a(samo njima primadaju)
  
  const {fileName, base64Data,user } = req.body;
  
  if(fileName == undefined ||base64Data == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    console.log("tu sam");
    return;
  }

  let buff = new Buffer.from(base64Data, 'base64');
  let path =user;
      let dir = './allFiles';
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
       dir = dir+"/"+path;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
 
 fs.writeFile("allFiles/"+path+"/"+fileName, buff, function (err) {
 
    if (err) {
      console.log("error: " + err)
      res.status(404);
      res.json({ error: err });
    }
    else {
      console.log("done");
      res.json({ message: "Done!" });
    }
  });
});

app.post('/api/web/agent/file/put', async (req, res) => {  //slanje agent file-ova na server od strane web-a
   
  const { name, location, ip, fileName, base64Data,user } = req.body;
  
  if(name == undefined || location == undefined ||ip == undefined ||fileName == undefined ||base64Data == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
 
  //create path
  let buff = new Buffer.from(base64Data, 'base64');
  let path = name + location + ip;
      let dir = './allFiles';
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
       dir = dir+"/"+path;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
 
      if(fileName === "config.json") {  

        dir = dir+"/config";
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
       // fileName="/config"+"31.3.2021"+".json"; //  ako bude datum trebao
        path= path + "/config";
       
      } 

 fs.writeFile("allFiles/"+path+"/"+fileName, buff, function (err) {
 
  if (err) {
      console.log("error: " + err)
      res.status(404);
      res.json({ error: err });
  } else {
      //send config file to agent
      let ws = clients[name + location + ip];
      if (ws !== undefined) {
        if(fileName==="config.json"){
          
          var response = {
            type: "putFile",
            fileName: fileName,
            path: path,
            data: base64Data,
            user:user
          }

          ws.send(JSON.stringify(response));
          //ws.send("config");
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
      
    res.json({ message: "Done!" });
    
  }
});
});

app.post('/api/agent/file/get', async (req, res) => {
  const { name, location, ip, fileName, path,user} = req.body;
  if(name == undefined || location == undefined ||ip == undefined ||fileName == undefined ||path == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }
  let ws = clients[name + location + ip];
  if (ws !== undefined) {
    if( (clients[name + location + ip].status == "In use" && clients[name + location + ip].user != user) ||clients[name+location+ip].status == "Waiting") {
      var errResp = {
        error: "Agent in use by another user!",
        name: name,
        location: location
      }
      if(clients[name+location+ip].status=="Waiting")errResp.error="You are not connected to that Agent!";
      res.statusCode = 404;
      res.json(errResp);
      return;
    }
    else {
      var response = {
          type: "getFile",
          fileName: fileName,
          path: path,
          user:user
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
  const { name, location, ip, fileName, path,user} = req.body;
  if(name == undefined || location == undefined ||ip == undefined ||fileName == undefined ||path == undefined ||user == undefined){
    res.status(404);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let ws = clients[name + location + ip];
  if (ws !== undefined) {

      let putanja=name + location + ip + "/";
      if(fileName==="config.json"){
       putanja=putanja + "/config/"
      }

      fs.readFile(putanja + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
          console.log("error: " + err)
          res.json({ error: "Error!" });
        }
        else {
          var response = {
            type: "putFile",
            fileName: fileName,
            path: path,
            data: data,
            user:user
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

app.post('/api/web/agent/fileList', async (req, res) => { //dobije hierarhiju fileova od agenta

  const { name, location, ip,user } = req.body;

  if(name == undefined || location == undefined || ip == undefined || user == undefined ){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let path=mainFolder+ "/" + name + location + ip;

  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }

  const tree = dirTree(path);
  res.status(200);
  res.send(tree);

});

app.post('/api/web/user/fileList', async (req, res) => { //dobije hierarhiju fileova od agenta

  const { user } = req.body;

  if(user == undefined ){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let path=mainFolder+ "/" + user;

  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }

  const tree = dirTree(path);
  res.status(200);
  res.send(tree);

});

app.get('/', (req, res) => {
  res.send('<h1>Up and running.</h1>');
})

function errFunction(name, location, ip) {
  try{
  var errResp = {
    error: "Client took too long to respond",
    name: name,
    location: location,
    ip: ip
  }
  responseMap[name + location + ip].reject(errResp);
}catch(err){
  console.log("errFunction error "+err);
}
}

if (!fs.existsSync(mainFolder)){
  fs.mkdirSync(mainFolder);
}

const PORT = process.env.PORT || 25565;
server.listen(PORT, () => console.log("Listening on port " + PORT));