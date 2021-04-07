const WebSocketService = require('../ws/websocket-service.js');
const timeoutError = require('../models/timeout-error.js');
const Error = require('../models/error.js');
const fs = require("fs");

async function executeCommandOnAgent(req, res) {
    const { deviceUid, command, path, user } = req.body;
    if (deviceUid == undefined || command == undefined || path == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(6, "Body not valid.")
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        res.json(error);
    }
    if ((ws.status == "In use" && ws.user != user) || ws.status == "Waiting") {
        const error = new Error.Error(7, "Device already in use.");
        if (ws.status == "Waiting") error.message = "You are not connected to that agent.";
        res.statusCode = 404;
        res.json(error);
        return;
    }
    const commandMessage = {
        type: "command",
        command: command,
        user: user,
        path: path
    }
    ws.send(JSON.stringify(commandMessage));
    WebSocketService.clearResponsePromiseForDevice(deviceUid);

    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
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
        clientArray.push({ name: client.name, location: client.location, deviceUid: client.deviceUid, path: client.path, status: client.status })
    }
    res.send(clientArray)
}

async function dissconectAgent(req, res) {
    const { deviceUid, user } = req.body;
    if (deviceUid == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bady not valid.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        res.json(error);
    }
    if (ws.status == "In use" && ws.user != user) {
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
    const { deviceUid, user } = req.body;
    if (deviceUid == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bad body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        res.json(error);
    }
    else if (ws.status === "In use") {
        const error = new Error.Error(9, "Device already in use.")
        if (ws.user == user) error.message = "You are already connected to this user!";
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
        ws.user = user;
        ws.send(JSON.stringify(response));
        res.statusCode = 200;
        res.json(response);
    }
}

async function getScreenshot(req, res) {
    const { deviceUid, user } = req.body;
    if (deviceUid == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(10, "Bad body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 404;
        res.json(error);
    }
    const response = {
        type: "getScreenshot",
        user: user
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        res.statusCode = 404;
        res.json(err);
    });
}

async function getFile(req, res) {
    const { deviceUid, fileName, path, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 400;
        res.json(error);
    }
    if ((ws.status == "In use" && ws.user != user) || ws.status == "Waiting") {
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
        ws.send(JSON.stringify(response));
        const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
        WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
            clearTimeout(errorTimeout);
            WebSocketService.clearResponsePromiseForDevice(deviceUid);
            res.json(val);
        }).catch((err) => {
            res.statusCode = 404;
            res.json(err);
        });
    }
}

async function putFile(req, res) {
    const { deviceUid, fileName, path, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid)
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 400;
        res.json(error);
    }
    let dir = `allFiles/${deviceUid}/`;
    if (fileName === "config.json") {
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
            const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
            WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
                clearTimeout(errorTimeout);
                WebSocketService.clearResponsePromiseForDevice(deviceUid);
                res.json(val);
            }).catch((err) => {
                res.statusCode = 404;
                res.json(err);
            });
        }
    });
}

async function putFileInAgentFolderDirectly(req, res) {
    const { deviceUid, fileName, path, base64, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || user == undefined || base64 == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 400;
        res.json(error);
    }
    const response = {
        type: "putFile",
        fileName: fileName,
        path: path,
        data: base64,
        user: user
    }
    ws.send(JSON.stringify(response));
    const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
    WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
        clearTimeout(errorTimeout);
        WebSocketService.clearResponsePromiseForDevice(deviceUid);
        res.json(val);
    }).catch((err) => {
        res.statusCode = 404;
        res.json(err);
    });
}

async function getFileFromAgentFolderDirectly(req, res)  { 


    console.log("AM here");
    const { deviceUid, fileName, path, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || path == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let ws = WebSocketService.getClient(deviceUid);
    if (ws == undefined) {
        const error = new Error.Error(9, "Device is not connected.");
        res.statusCode = 400;
        res.json(error);
        return;
    }
        if ((ws.status == "In use" && ws.user != user) || ws.status == "Waiting") {
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
            const errorTimeout = setTimeout(timeoutError.timeoutError, 10000, deviceUid);
            WebSocketService.getResponsePromiseForDevice(deviceUid).then((val) => {
                clearTimeout(errorTimeout);
                WebSocketService.clearResponsePromiseForDevice(deviceUid);
                res.json(val);
            }).catch((err) => {
                res.statusCode = 404;
                res.json(err);
            });
        }
}

module.exports = {
    executeCommandOnAgent,
    getOnlineAgents,
    dissconectAgent,
    connectAgent,
    getScreenshot,
    getFile,
    putFile,
    putFileInAgentFolderDirectly,
    getFileFromAgentFolderDirectly
}