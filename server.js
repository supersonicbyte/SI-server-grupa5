const auth = require('./auth/auth.js');
const accessAuth = require('./auth/access_auth.js');
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
//array of valid unique
const uniqueValid = [];

const DELAY = 300000; // In ms

const date = new Date();

const mainFolder = "allFiles";

/*
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
*/

app.post('/login', async function (req, res, next) {
  const uniqueId = req.body.id;
  const validation = await unique.validateUniqueCode(uniqueId);

  if (validation.status != 200) {
    res.status(validation.status);
    res.send({error: "Id not valid!"});
    console.log("Id not valid for "+uniqueId);
    return;
  } else {
    uniqueValid.push(uniqueId)
    res.status(validation.status);
    res.send({message: 'Session updated' });
    console.log("Session updated ");
  }
  next();
});

server.on('upgrade', function (request, socket, head) {

  console.log(request.headers.cookie);
   if (!uniqueValid.includes(request.headers.cookie.split('=')[1])) {
      console.log(request.headers);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      console.log("Destroyan");
      return;
    }

    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request);
    });
 
});

wss.on('connection', function connection(ws, request) {
  ws.on('message', (message) => {

    message = message.replace(/\n/g, "\\n");
    message = message.replace(/\r/g, "\\r");
    message = message.replace(/\\/g, "\\\\");
    //message = message.replace(/\\n/g, "\\\\n");
    //console.log("I got "+message);
    
    message = JSON.parse(message);

    if (message.type === 'sendCredentials') {

      if(clients[message.deviceUid]!=undefined){

        ws.send('{"type":"Error", "message":"Already connected"}');
        console.log("Client already connected: " + "Client: " +message.name+" "+ message.deviceUid + " " + date.toUTCString());
        ws.close();
        return;

      }

      console.log("Client connected: " + "Client: " +message.name+" "+ message.deviceUid + " " + date.toUTCString());
      ws.name = message.name;
      ws.location = message.location;
      ws.deviceUid=message.deviceUid;
      ws.path = message.path;
      ws.status = "Waiting";
      ws.send( JSON.stringify({type:"Connected"})); 
      clients[message.deviceUid] = ws;
      responseMap[message.deviceUid] = emptyPromise();
      
    }
    else if (message.type === "command_result") {
      messageMap[message.deviceUid].message = message.message;//
     // console.log("saljem asimu "+JSON.stringify({token:messageMap[message.deviceUid].token,message:message.message,path:message.path}));
      responseMap[message.deviceUid].resolve({token:messageMap[message.deviceUid].token,message:message.message,path:message.path});
    }else if (message.type === "sendScreenshot") {
      messageMap[message.deviceUid].message = message.message;//
      responseMap[message.deviceUid].resolve(messageMap[message.deviceUid]);
    }else if (message.type === "sendFile") {
      
      console.log("I got a file ");
      let buff = new Buffer.from(message.message, 'base64');

      let path = message.deviceUid;
      let dir = mainFolder+ "/" +path;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }
      
 
      if(message.fileName==="config.json"){  

        dir = dir+"/config";
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
        }
       
      } 

      fs.writeFile(dir+"/"+message.fileName, buff, function (err) {
        if (err) {
          responseMap[message.deviceUid].reject({type:"Error",message:"Error writing file"});
        }
        else {
          responseMap[message.deviceUid].resolve({type:"Success",message:"File successfully written."});
          console.log("File written to "+dir+"/"+message.fileName);
        }
      });

    }else if (message.type === "sendFileDirect") {

      var response = {
        fileName: message.fileName,
        base64: message.message
      }
 
      responseMap[message.deviceUid].resolve(response);
    }else if (message.type === "savedFile") {
      responseMap[message.deviceUid].resolve({type:"Success",message:"File saved on agent!"});
   
    }else if (message.type === "pong") {
      console.log(ws.name+" ponged");
      ws.send(JSON.stringify({type:"ping"}));
    }else if(message.type === "error"){
      if(responseMap[message.deviceUid]!=undefined){

        console.log("Agent error");
        responseMap[message.deviceUid].status=405;
        responseMap[message.deviceUid].reject({type:"Error",message:message.message});

      }
    }else{
     // console.log("I got "+message);
    }
  });

  ws.on('close',() =>{

    let id = ws.deviceUid;
    console.log(id+" has disconnected");
    let socket = clients[id];

    if(socket == undefined)return;

    var errResp = {
      error: "Device couldnt respond!",
      deviceUid:ws.deviceUid
    }
    responseMap[id].status=400;
    responseMap[id].resolve(errResp);
    clients[id]=undefined;
    delete uniqueValid[uniqueValid.indexOf(socket.uniqueId)];

  });

});

// validator for all /api routes, checks if token is valid
app.use('/api', async function (req, res, next) {
  const { deviceUid, command } = req.body;
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
     messageMap[deviceUid] = messageResponse;//

  }
  next();
});
 
app.use('/api/*/agent', async function (req, res, next) {

  const { user,deviceUid } = req.body;
  
  const authHeader = req.headers.authorization;
  const validation = await accessAuth.validateUserAccess(authHeader,deviceUid);
  if (validation.status != 200) {
    res.status(validation.status);
    res.send("");
    return;
  }
  next();
});

app.post('/api/agent/command', async (req, res) => {
  const { deviceUid, command ,path, user} = req.body;
  if(deviceUid==undefined ||command == undefined || path == undefined||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }
  let ws = clients[deviceUid];
  if (ws !== undefined) {
    if( (clients[deviceUid].status == "In use" && clients[deviceUid].user != user) ||clients[deviceUid].status == "Waiting") {
      var errResp = {
        error: "Agent in use by another user!",
        deviceUid:deviceUid
      }
      if(clients[deviceUid].status=="Waiting")errResp.error="You are not connected to that Agent!";
      res.statusCode = 404;
      res.json(errResp);
      return;
    }
    var response = {
      type: "command",
      command: command,
      user:user,
      path:path
      
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, deviceUid);
    responseMap[deviceUid].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[deviceUid] = emptyPromise();

      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      deviceUid:deviceUid
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});//

app.get('/api/agent/online', async (req, res) => { 
  var clientArray = [];
  const authHeader = req.headers.authorization;

  /*const tokenResponse =await fetch("https://si-2021.167.99.244.168.nip.io/api/device/AllDevices", {
    headers: { "Authorization": authHeader }
    }).then(res => {
    return res;    
    });

    let x = await tokenResponse.json();

  for(let d of x.data){
    let client = clients[d.deviceUid];
    if(client==undefined)continue;
    clientArray.push({ name: client.name, location: client.location, ip: client.ip,deviceUid:client.deviceUid, path:client.path,status:client.status })
  }*/

  for(let c in clients){
    let client = clients[c];
    if(client==undefined)continue;
    clientArray.push({name: client.name, location: client.location, deviceUid:client.deviceUid, path:client.path,status:client.status })
  }

  res.send(clientArray)
});

app.post('/api/agent/disconnect', async (req, res) => {

  const { deviceUid ,user } = req.body;
  if(deviceUid==undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }

  let ws = clients[deviceUid];
  if (ws !== undefined) {
    
    if(clients[deviceUid].status=="In use" && clients[deviceUid].user != user){

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
      deviceUid:deviceUid
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});//

app.post('/api/agent/connect', async (req, res) => {
  const { deviceUid,user } = req.body;

  if(deviceUid == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }

  let ws = clients[deviceUid];
  if (ws !== undefined) {
    if(ws.status === "In use") {
      var errResp = {
        error: "Device is already in use!",
        deviceUid:deviceUid
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
      deviceUid:deviceUid
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});//

app.post('/api/agent/screenshot', async (req, res) => {

  const {deviceUid,user } = req.body;
  if(deviceUid == undefined || user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  
  let ws = clients[deviceUid];
  if (ws !== undefined) {
    var response = {
      type: "getScreenshot",
      user:user
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(errFunction, 10000, deviceUid);
    responseMap[deviceUid].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[deviceUid] = emptyPromise();
      res.json(val);
    }).catch((err) => {
      res.statusCode = 404;
      res.json(err);
    });
  }
  else {
    var errResp = {
      error: "Device is not connected to the server!",
      deviceUid:deviceUid
    }
    res.statusCode = 404;
    res.json(errResp);
  }
});//

app.post('/api/web/user/file/get', async (req, res) => { //user uzima svoj file sa servera
  const { path,fileName,user } = req.body;

  if(fileName == undefined ||user == undefined || path == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let putanja="allFiles/" +user+"/"+path;

  fs.readFile(putanja+ "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      res.json({ error: "Error, no such file!" });
    }
    else {
      var response = {
        fileName: fileName,
        base64: data
      }
      res.status = 200;
      res.send(response);
    }
  });
});

app.post('/api/web/agent/file/get', async (req, res) => { //user trazi file sa servera koji pripada nekoj masini(agentu)
  const {deviceUid, path,fileName,user } = req.body;

  if(deviceUid == undefined || fileName == undefined || user == undefined ){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }

  let dir = mainFolder+"/"+deviceUid;
  if(fileName === "config.json" )
  dir =dir +"/config";
  else dir =dir +"/"+path

  fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
    if (err) {
      console.log("/api/web/agent/file/get error: " + err)
      res.json({ error: "Error, no such file!" });
    }
    else {
      var response = {
        fileName: fileName,
        base64: data
      }
      res.status = 200;
      res.send(response);
    }
  });
});//

app.post('/api/web/user/file/put', async (req, res) => {  //spasavanje user file-ova na server od strane web-a(samo njima pripadaju)
  
  const {path,fileName, base64,user } = req.body;
  
  if(fileName == undefined ||base64 == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }

  let buff = new Buffer.from(base64, 'base64');

      let dir = mainFolder+"/"+user+"/"+path;

      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err){
          res.send({type:"Error making directories"});
          return;
        }else{
 
          fs.writeFile(dir+"/"+fileName, buff, function (err) {
 
            if (err) {
              console.log("/api/web/user/file/put error: " + err)
              res.status(404);
              res.json({ error: err });
            }
            else {
              console.log("done");
              res.json({ message: "Done!" });
            }
          });

        }
      });

});

app.post('/api/web/agent/file/put', async (req, res) => {  //spasi web file u agent folder i posalje desktopu ako je config file
   
  const { deviceUid,path ,fileName, base64,user } = req.body;
  
  if(deviceUid == undefined ||fileName == undefined ||base64 == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
 
  //create path
  let buff = new Buffer.from(base64, 'base64');
  let dir = mainFolder+"/"+deviceUid;
 
      if(fileName === "config.json")
        dir = dir+"/config";
      
        
      else dir=dir+"/"+path;
       // fileName="/config"+"31.3.2021"+".json"; //  ako bude datum trebao
       
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err){
          res.status(404);
          res.send({error:"Error making directories"});
          return;
        }else{
 
          fs.writeFile(dir+"/"+fileName, buff, function (err) {
 
            if (err) {
                console.log("/api/web/agent/file/put error: " + err)
                res.status(404);
                res.json({ error: err });
                return;
            } else {
                //send config file to agent        
                  if(fileName==="config.json"){
                    
                    let ws = clients[deviceUid];
                    if (ws !== undefined) {

                    var response = {
                      type: "putFile",
                      fileName: fileName,
                      path: "",
                      data: base64,
                      user:user
                    }
          
                    ws.send(JSON.stringify(response));
                    const errorTimeout = setTimeout(errFunction, 10000, deviceUid); 
                    responseMap[deviceUid].then((val) => {
                      clearTimeout(errorTimeout);
                      responseMap[deviceUid] = emptyPromise();
                      res.json(val);
                    }).catch((err) => {
                      res.statusCode = 404;
                      res.json(err);
                    });
                  return;
                  }
                  else {
                    var errResp = {
                       error: "Config saved but agent is not online!",
                       deviceUid:deviceUid
                     }
                     
                   res.statusCode = 210;
                   res.json(errResp);
                   return;
                 }
                } else res.json({ message: "Done!" });
                
              
              
            }
          });
          

        }
      });
});//

app.post('/api/agent/file/get', async (req, res) => {//uzme file od agent u agent folder

  const { deviceUid, fileName, path,user} = req.body;
  if(deviceUid == undefined ||fileName == undefined ||path == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }
  let ws = clients[deviceUid];
  if (ws !== undefined) {
    if( (clients[deviceUid].status == "In use" && clients[deviceUid].user != user) ||clients[deviceUid].status == "Waiting") {
      var errResp = {
        error: "Agent in use by another user!",
        deviceUid:deviceUid
      }
      if(clients[deviceUid].status=="Waiting")errResp.error="You are not connected to that Agent!";
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
      const errorTimeout = setTimeout(errFunction, 10000, deviceUid); 
      responseMap[deviceUid].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[deviceUid] = emptyPromise();
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
     deviceUid:deviceUid
   }
   res.statusCode = 404;
   res.json(errResp);
 }
 
});//

app.post('/api/agent/file/put', async (req, res) => {//posalje file iz agent foldera na agenta
  const { deviceUid, fileName, path,user} = req.body;
  if(deviceUid == undefined ||fileName == undefined ||path == undefined ||user == undefined){
    res.status(404);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let ws = clients[deviceUid];
  if (ws !== undefined) {

    let dir=mainFolder+"/"+deviceUid + "/";
      if(fileName==="config.json"){
       dir+="config"
      }
      

      fs.readFile(dir+"/"+ fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
          console.log("error: " + err+" \n"+dir+"/"+fileName)
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
          const errorTimeout = setTimeout(errFunction, 10000, deviceUid); 
          responseMap[deviceUid].then((val) => {
            clearTimeout(errorTimeout);
            responseMap[deviceUid] = emptyPromise();
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
      deviceUid:deviceUid
    }
   res.statusCode = 404;
   res.json(errResp);
 } 
});//

app.post('/api/agent/file/directPut', async (req, res) => {//stavi file direktno na agenta

  const {deviceUid, fileName, path,base64,user} = req.body;

  if(deviceUid == undefined ||fileName == undefined ||path == undefined ||user == undefined || base64 == undefined){
    res.status(404);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let ws = clients[deviceUid];
  if (ws !== undefined) {

          var response = {
            type: "putFile",
            fileName: fileName,
            path: path,
            data: base64,
            user:user
          }
          ws.send(JSON.stringify(response));
          const errorTimeout = setTimeout(errFunction, 10000, deviceUid); 
          responseMap[deviceUid].then((val) => {
            clearTimeout(errorTimeout);
            responseMap[deviceUid] = emptyPromise();
            res.json(val);
          }).catch((err) => {
            res.statusCode = 404;
            res.json(err);
          });
  } else {
    var errResp = {
      error: "Device is not connected to the server!",
      deviceUid:deviceUid
    }
   res.statusCode = 404;
   res.json(errResp);
 } 
});//

app.post('/api/agent/file/directGet', async (req, res) => {// uzme file direktno sa agenta

  const {deviceUid, fileName, path,user} = req.body;
  if(deviceUid == undefined ||fileName == undefined ||path == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Error, got wrong json"});
    return;
  }
  let ws = clients[deviceUid];
  if (ws !== undefined) {
    if( (clients[deviceUid].status == "In use" && clients[deviceUid].user != user) ||clients[deviceUid].status == "Waiting") {
      var errResp = {
        error: "Agent in use by another user!",
        deviceUid:deviceUid
      }
      if(clients[deviceUid].status=="Waiting")errResp.error="You are not connected to that Agent!";
      res.statusCode = 404;
      res.json(errResp);
      return;
    }
    else {
      var response = {
          type: "getFileDirect",
          fileName: fileName,
          path: path,
          user:user
      }
      ws.send(JSON.stringify(response));
      const errorTimeout = setTimeout(errFunction, 10000, deviceUid); 
      responseMap[deviceUid].then((val) => {
      clearTimeout(errorTimeout);
      responseMap[deviceUid] = emptyPromise();
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
     deviceUid:deviceUid
   }
   res.statusCode = 404;
   res.json(errResp);
 }
 
});//

app.post('/api/web/agent/fileList', async (req, res) => { //dobije hierarhiju fileova od agenta

  const {deviceUid,user } = req.body;

  if(deviceUid == undefined || user == undefined ){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let path=mainFolder+ "/" + deviceUid;

  if (!fs.existsSync(path)){
    fs.mkdirSync(path);
  }

  const tree = dirTree(path);
  res.status(200);
  res.send(tree);

});//

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

app.post('/api/web/user/file/getText', async (req, res) => { //user uzima svoj file sa servera
  const { path,fileName,user } = req.body;

  if(fileName == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let dir="allFiles/" +user+"/"+path;

  fs.readFile(dir+ "/" + fileName,{encoding: 'utf-8'}, function (err, fileText) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error, no such file!" });
    }
    else {
      var response = {
        fileName: fileName,
        text: fileText
      }
      res.status = 200;
      res.send(response);
    }
  });
});

app.post('/api/web/agent/file/getText', async (req, res) => { //user uzima svoj file sa servera
  const { deviceUid,path,fileName,user } = req.body;

  if(fileName == undefined ||user == undefined){
    res.status(400);
    res.send({message:"Erorr, got wrong json"});
    return;
  }
  let dir="allFiles/" +deviceUid+"/"+path;

  fs.readFile(dir+ "/" + fileName,{encoding: 'utf-8'}, function (err, fileText) {
    if (err) {
      console.log("error: " + err)
      res.json({ error: "Error, no such file!" });
    }
    else {
      var response = {
        fileName: fileName,
        text: fileText
      }
      res.status = 200;
      res.send(response);
    }
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Up and running.</h1>');
})

function errFunction(deviceUid) {
  try{
  var errResp = {
    error: "Client took too long to respond",
    deviceUid:deviceUid
  }
  responseMap[deviceUid].reject(errResp);
}catch(err){
  console.log("errFunction error "+err);
}
}

if (!fs.existsSync(mainFolder)){
  fs.mkdirSync(mainFolder);
}

const PORT = process.env.PORT || 25565;
server.listen(PORT, () => console.log("Listening on port " + PORT));