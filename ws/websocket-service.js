const Error = require('../models/error.js');
const emptyPromise = require('empty-promise');
const fs = require("fs")
/**
 * Maps holding information on connected clients.
 */
const clients = new Map();
const responseMap = new Map();
const messageMap = new Map();
const uniqueIds = [];
const mainFolder = "allFiles";
/**
 * Configure websocket and server callbacks
 * @param {WebSocket server} wss
 * @param {Htpp server} server 
 */
function configure(wss, server) {
    if (!fs.existsSync(mainFolder)) {
        fs.mkdirSync(mainFolder);
    }
    wss.on('connection', function connection(ws, request) {
        ws.on('message', (message) => {
            const date = new Date();
            message = message.replace(/\n/g, "\\n");
            message = message.replace(/\r/g, "\\r");
            message = message.replace(/\\/g, "\\\\");
            try {
                message = JSON.parse(message);
            } catch (error) {
                console.log(error);
            }
            if (message.type === 'sendCredentials') {
                if (clients[message.deviceUid] != undefined) {
                    ws.send('{"type":"Error", "message":"Already connected"}');
                    console.log("Client already connected: " + "Client: " + message.name + " " + message.deviceUid + " " + date.toUTCString());
                    ws.close();
                    return;
                }
                console.log("Client connected: " + "Client: " + message.name + " " + message.deviceUid + " " + date.toUTCString());
                ws.name=message.name;
                ws.location=message.location;
                ws.deviceUid = message.deviceUid;
                ws.path = message.path;
                ws.status = "Waiting";
                ws.send(JSON.stringify({ type: "Connected" }));
                clients[message.deviceUid] = ws;
                responseMap[message.deviceUid] = emptyPromise();
            } else if (message.type === "command_result") {
                messageMap[message.deviceUid].message = message.message; 
                responseMap[message.deviceUid].resolve({ token: messageMap[message.deviceUid].token, message: message.message, path: message.path });
            } else if (message.type === "sendScreenshot") {
                messageMap[message.deviceUid].message = message.message; 
                responseMap[message.deviceUid].resolve(messageMap[message.deviceUid]);
            
            } else if (message.type === "sendFile") {
                console.log("I got a file ");
                let buff = new Buffer.from(message.message, 'base64');
                let path = message.deviceUid;
                let dir = mainFolder + "/" + path;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
                if (message.fileName === "config.json") {
                    dir = dir + "/config";
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
                }
                fs.writeFile(dir + "/" + message.fileName, buff, function (err) {
                    if (err) {
                        responseMap[message.deviceUid].reject({ success: false, message: "Error writing file!" });
                    } else {
                        responseMap[message.deviceUid].resolve({ success: true, message: "File successfully written." });
                        console.log("File written to " + dir + "/" + message.fileName);
                    }
                });
            } else if (message.type === "sendFileDirect") {
                var response = {
                    fileName: message.fileName,
                    base64: message.message
                }
                responseMap[message.deviceUid].resolve(response);
            } else if (message.type === "savedFile") {
                responseMap[message.deviceUid].resolve({ type: "Success", message: "File saved on agent!" });
            } else if (message.type === "information") {
                messageMap[message.deviceUid].message = message.message; 
                responseMap[message.deviceUid].resolve(messageMap[message.deviceUid]);
            
            } else if (message.type === "pong") {
                console.log(ws.name + " ponged");
                ws.send(JSON.stringify({ type: "ping" }));
            } else if (message.type === "error") {
                if (responseMap[message.deviceUid] != undefined) {
                    console.log("Agent error");
                    responseMap[message.deviceUid].status = 405;
                    responseMap[message.deviceUid].reject({ type: "Error", message: message.message });

                }
            }
        });

        ws.on('close', () => {
            const id = ws.deviceUid;
            console.log(id + " has disconnected");
            let socket = clients[id];
            if (socket == undefined) return;
            const error = new Error.Error(3,"Device took too long to respond.");
            responseMap[id].status = 400;
            responseMap[id].resolve(error);
            clients[id] = undefined;
            delete uniqueIds[uniqueIds.indexOf(socket.uniqueId)];
        });
    });

    server.on('upgrade', function(request, socket, head) {
        console.log(request.headers.cookie);
        if (request.headers.cookie == undefined) return;
        if (!uniqueIds.includes(request.headers.cookie.split('=')[1])) {
            console.log(request.headers);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            console.log("Destroyan");
            return;
        }
        wss.handleUpgrade(request, socket, head, function(ws) {
            wss.emit('connection', ws, request);
        });
    });
}
/**
 * Functions for handling state of WebSocket service.
 *  
 */
function addSession(id) {
    uniqueIds.push(id);
}

function setMessageResponseForDevice(id, messageResponse) {
    messageMap[id] = messageResponse;
}

function getClient(id) {
    return clients[id];
}

function setErrorOnResposneForDevice(id, error) {
    responseMap[id].reject(error);
}

function getResponsePromiseForDevice(id) {
    return responseMap[id];
}

function clearResponsePromiseForDevice(id) {
    responseMap[id] = emptyPromise()
}

function getClients() {
    return clients;
}

module.exports = {
    configure,
    addSession,
    setMessageResponseForDevice,
    getClient,
    setErrorOnResposneForDevice,
    getResponsePromiseForDevice,
    clearResponsePromiseForDevice,
    getClients
}