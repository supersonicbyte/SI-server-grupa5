const WebSocketService = require('../ws/websocket-service.js');
const timeoutError = require('../models/timeout-error.js');
const Error = require('../models/error.js');
const fs = require("fs");
const { ESRCH } = require('constants');

async function executeCommandOnAgent(req, res) {
    const { deviceUid, command, path } = req.body;
    if (deviceUid == undefined || command == undefined || path == undefined ) {
        res.status(400);
        const error = new Error.Error(6, "Body not valid.")
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    const commandMessage = {
        type: "command",
        command: command,
        user: req.user.mail,
        path: path
    }
    ws.send(JSON.stringify(commandMessage));
    ws.busy=true;
    WebSocketService.clearResponsePromiseForDevice(deviceUid);

    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        ws.busy=false;
        res.statusCode = 404;
        res.json(err);
    });
}

function getOnlineAgents(req, res) {
    let clientArray = [];
    // auth for online clients?
    const authHeader = req.headers.authorization;
    let clients = WebSocketService.getClients();
    for (let c in clients) {
        let client = clients[c];
        if (client == undefined) continue;
        clientArray.push({ name: client.name, location: client.location, deviceUid: client.deviceUid, path: client.path, status: client.status, user: client.user })
    }
    res.send(clientArray)
}

async function dissconectAgent(req, res) {
    const { deviceUid } = req.body;
    if (deviceUid == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bady not valid.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgentConnect(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    const response = {
        type: "Waiting",
        user: req.user.mail,
        message: "User successfully disconnected!"
    }
    ws.send(JSON.stringify(response));
    ws.status = "Waiting";
    ws.user = "";
    res.statusCode = 200;
    res.json(response);
}

async function connectAgent(req, res) {
    const { deviceUid } = req.body;
    if (deviceUid == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bad body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgentConnect(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    } 
 
    var response = {
        success: true,
        type: "In use",
        user: req.user.mail,
        message: "Connection successful!"
    }
    ws.status = "In use";
    ws.user = req.user.mail;
    res.statusCode = 200;
    res.json(response);
    
}

async function getScreenshot(req, res) {
    const { deviceUid} = req.body;

    if (deviceUid == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bad body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    const response = {
        type: "getScreenshot",
        user: req.user.mail
    }
    ws.send(JSON.stringify(response));
    ws.busy=true;
    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        ws.busy=false;
        res.statusCode = 404;
        res.json(err);
    });
}

async function getFileFromAgentToFolder(req, res) {
    const folder = req.params.folder;
    const { deviceUid, fileName, path } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || folder == undefined ) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }

    if(folder != deviceUid && folder != req.user.mail){

        res.status(300);
        const error = new Error.Error(7, "Invalid folder.");
        res.send(error);
        return;

    }

    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
     
    var response = {
        type: "getFile",
        fileName: fileName,
        path: path,
        user: req.user.mail
    }
    ws.folder = folder;
    ws.send(JSON.stringify(response));
    ws.busy=true;
    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        ws.busy=false;
        res.statusCode = 404;
        res.json(err);
    });
    
}

async function putFilesToAgentFromFolder(req, res) {


    const { deviceUids, files } = req.body;

    if (deviceUids == undefined || files == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }

    let folder = req.user.mail;

    res.response = [];
    res.iter = deviceUids.length;

    filesJson = [];
    fileResponses = [];
    

    for(f in files){

        fileName = files[f].fileName;
        path = files[f].path;

        let dir = `allFiles/${folder}/`;
        if (fileName === "config.json") 
            dir += "config"

       try{
       let temp = await readFile(dir,fileName,path,filesJson,fileResponses);
       filesJson.push(temp);
       }catch(e){
        fileResponses.push(e);
       }
    }

    for(d in deviceUids){

        deviceUid = deviceUids[d].deviceUid;
        let ws = WebSocketService.getClient(deviceUid);
        
        let vertified = await verifyAgentExist(ws,res);

        if(!vertified.success){
            addToResponse(res,{message:vertified.message,deviceUid:deviceUid},5);
            continue;
        }   

        ws.errors = fileResponses;

        let agentCommand = {
            type:"putFiles",
            user:req.user.mail,
            files:filesJson
        }
        ws.send(JSON.stringify(agentCommand));
        ws.busy=true;
        const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
        WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
            clearTimeout(errorTimeout);
            WebSocketService.clearResponsePromiseForDevice(val.deviceUid);
            addToResponse(res,val,0);

        }).catch((err) => {
            ws.busy=false;
            res.statusCode = 404;
            console.log(err);
            addToResponse(res,err,-5);
        });
    }

}

async function putFileToAgentFromFolder(req, res) {

const folder = req.params.folder;
const { deviceUid, fileName, path, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    
        if(folder != deviceUid && folder != req.user.mail){

        res.status(300);
        const error = new Error.Error(7, "Invalid folder.");
        res.send(error);
        return;

    }

    let ws = WebSocketService.getClient(deviceUid)

    let dir = `allFiles/${folder}/`;
    if (fileName === "config.json" && folder == deviceUid) {
        dir += "config"
    }

    fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
            console.log("error: " + err + " \n" + dir + "/" + fileName)
            const error = new Error.Error(13, "File does not exists.");
            res.json(error);
        } else {
            var response = {
                type: "putFile",
                fileName: fileName,
                path: path,
                data: data,
                user: user
            }
            ws.send(JSON.stringify(response));
            ws.busy=true;
            const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
            WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
                clearTimeout(errorTimeout);
                WebSocketService.clearResponsePromiseForDevice(deviceUid);
                res.json(val);
            }).catch((err) => {
                ws.busy=false;
                res.statusCode = 404;
                res.json(err);
            });
        }
    });


}

async function readFile(dir,fileName,path) {

    return new Promise((resolve, reject) => {
        fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
            if (err) {
                const error = new Error.Error(13, "File " + dir + "/" + fileName + "does not exists.");
                reject({error:error});
            }
            else{
                let response = {
                    fileName: fileName,
                    path: path,
                    data: data
                }
                //filesJson.push(response);
                resolve(response);
            }
        });
    });

  }

async function addToResponse(res,value, sth){

    res.response.push(value);
    if(--res.iter<=0)res.send(res.response);

}

async function putFileInAgentDirectly(req, res) {
    const { deviceUid, fileName, path, base64 } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined ||  base64 == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    const response = {
        type: "putFile",
        fileName: fileName,
        path: path,
        data: base64,
        user: req.user.mail
    }
    ws.send(JSON.stringify(response));
    ws.busy=true;
    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        ws.busy=false;
        res.statusCode = 404;
        res.json(err);
    });
}

async function getFileFromAgentDirectly(req, res)  { 
    const { deviceUid, fileName, path} = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined ) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    if ((ws.status == "In use" && ws.user != req.user.mail) || ws.status == "Waiting") {
        const error = new Error.Error(4, "Agent is already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that agent.";
        res.statusCode = 400;
        res.json(error);
        return;
    } else {
        const response = {
            type: "getFileDirect",
            fileName: fileName,
            path: path,
            user: req.user.mail
        }
        ws.send(JSON.stringify(response));
        ws.busy=true;
        const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
        WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
            clearTimeout(errorTimeout);
            WebSocketService.clearResponsePromiseForDevice(deviceUid);
            res.json(val);
        }).catch((err) => {
            ws.busy=false;
            res.statusCode = 404;
            res.json(err);
        });
    }
}

async function getInfo (req, res) {
    const { deviceUid } = req.body;
    if (deviceUid == undefined ) {
        res.status(400);
        const error = new Error.Error(10, "Bad body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,req,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }

    const response = {
        type: "systemInfo",
        user: req.user.mail
    }
    
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(timeoutError.timeoutError, 30000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        ws.busy=false;
        res.statusCode = 404;
        res.json(err);
    }); 
}

async function verifyAgent(ws,req,res){

    
    let returnMessage = {
        message:"All okay",
        success:true
    }
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        returnMessage.message=error;
        returnMessage.success=false;
    }
    else if (ws.busy) {
        res.status(380);
        const error = new Error.Error(10, "Agent already in use");
        returnMessage.message=error;
        returnMessage.success=false;
    }
    else if ((ws.status == "In use" && ws.user != req.user.mail) || ws.status == "Waiting") {
        const error = new Error.Error(4, "Agent is already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that agent.";
        returnMessage.message=error;
        returnMessage.success=false;
        res.statusCode = 350;
    }
     return returnMessage;

}

async function verifyAgentConnect(ws,req,res){

    
    let returnMessage = {
        message:"All okay",
        success:true
    }
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        returnMessage.message=error;
        returnMessage.success=false;
    }
    else if (ws.busy) {
        res.status(400);
        const error = new Error.Error(10, "Agent already in use");
        returnMessage.message=error;
        returnMessage.success=false;
    }
    else if ((ws.status == "In use" && ws.user != req.user.mail)) {
        const error = new Error.Error(4, "Agent is already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that agent.";
        else if (ws.user == req.user.mail) error.message = "You are already connected to this user!";
        returnMessage.message=error;
        returnMessage.success=false;
        res.statusCode = 400;
    }
     return returnMessage;

}

async function verifyAgentExist(ws,res){

    
    let returnMessage = {
        message:"All okay",
        success:true
    }
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        returnMessage.message=error;
        returnMessage.success=false;
    }
    else if (ws.busy) {
        res.status(400);
        const error = new Error.Error(10, "Agent already in use");
        returnMessage.message=error;
        returnMessage.success=false;
    }
     return returnMessage;

}


module.exports = {
    executeCommandOnAgent,
    getOnlineAgents,
    dissconectAgent,
    connectAgent,
    getScreenshot,
    getFileFromAgentToFolder,
    putFileToAgentFromFolder,
    putFilesToAgentFromFolder,
    putFileInAgentDirectly,
    getFileFromAgentDirectly,
    getInfo
}