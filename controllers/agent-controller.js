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
    let vertified = await verifyAgent(ws,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    if ((ws.status == "In use" && ws.user != req.user.mail) || ws.status == "Waiting") {
        const error = new Error.Error(7, "Device already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that agent.";
        res.statusCode = 404;
        res.json(error);
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
    let vertified = await verifyAgent(ws,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    if (ws.status == "In use" && ws.user != req.user.mail) {
        const error = new Error.Error(7, "You are not connected to the agent.");
        res.statusCode = 404;
        res.json(error);
        return;
    }
    const response = {
        type: "Waiting",
        user: user,
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
    let vertified = await verifyAgent(ws,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    if (ws.status === "In use") {
        const error = new Error.Error(9, "Device already in use.")
        if (ws.user == req.user.mail) error.message = "You are already connected to this user!";
        res.statusCode = 404;
        res.json(error);
        return;
    } else {
        var response = {
            success: true,
            type: "In use",
            user: user,
            message: "Connection successful!"
        }
        ws.status = "In use";
        ws.user = req.user.mail;
        ws.send(JSON.stringify(response));
        res.statusCode = 200;
        res.json(response);
    }
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
    let vertified = await verifyAgent(ws,res);
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
    let ws = WebSocketService.getClient(deviceUid);
    let vertified = await verifyAgent(ws,res);
    if(!vertified.success){
        res.send(vertified.message);
        return;
    }
    if ((ws.status == "In use" && ws.user != req.user.mail) || ws.status == "Waiting") {
        const error = new Error.Error(4, "Agent already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that Agent!";
        res.statusCode = 404;
        res.json(error);
        return;
    } else {
        var response = {
            type: "getFile",
            fileName: fileName,
            path: path,
            user: user
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
}

async function putFileToAgentFromFolder(req, res) {

    const folder = req.params.folder;
    const { deviceUids, fileName, path } = req.body;
    if (deviceUids == undefined || fileName == undefined || path == undefined || folder == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }

    
    res.response = [];
    res.iter = deviceUids.length;
    console.log("Iter je "+res.iter);
    res.iter--;
    console.log("Sad je "+res.iter);
    res.iter++;

    for(d in deviceUids){

    deviceUid = deviceUids[d].deviceUid;
    let ws = WebSocketService.getClient(deviceUid);
    
    let vertified = await verifyAgent(ws,res);

    if(!vertified.success){
        addToResponse(res,{message:vertified.message,deviceUid:deviceUid});
        continue;
    }

    let dir = `allFiles/${folder}/`;
    if (fileName === "config.json") {
        dir += "config"
    }

    fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
            console.log("error: " + err);
            const error = new Error.Error(13, "File does not exists.");
            addToResponse(res.response,error,res,res.iter);
        } else {
            var response = {
                type: "putFile",
                fileName: fileName,
                path: path,
                data: data,
                user: req.user.mail
            }
            ws.send(JSON.stringify(response));
            ws.busy=true;
            const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
            WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
                clearTimeout(errorTimeout);
                WebSocketService.clearResponsePromiseForDevice(deviceUid);
                console.log(res.response.length);
                addToResponse(res,val);

            }).catch((err) => {
                ws.busy=false;
                res.statusCode = 404;
                addToResponse(res,err);
            });
        }
    });

    }

    
}

async function addToResponse(res,value){

    res.response.push(value);
    res.iter--;
    console.log("Iter je sada "+res.iter);
    if(res.iter<=0)res.send(res.response);

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
    let vertified = await verifyAgent(ws,res);
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
    let vertified = await verifyAgent(ws,res);
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
}

async function verifyAgent(ws,res){

    
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
    putFileInAgentDirectly,
    getFileFromAgentDirectly
}