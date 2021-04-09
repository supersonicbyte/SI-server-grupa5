const Error = require('../models/error.js');
const fs = require("fs");
const WebSocketService = require('../ws/websocket-service.js');
const timeoutError = require('../models/timeout-error.js');
const dirTree = require("directory-tree");
const fse = require('fs-extra');

const removeDir = function(path1) {
    if (fs.existsSync(path1)) {
      const files = fs.readdirSync(path1)
  
      if (files.length > 0) {
        files.forEach(function(filename) {
          if (fs.statSync(path1 + "/" + filename).isDirectory()) {
            removeDir(path1 + "/" + filename)
          } else {
            fs.unlinkSync(path1 + "/" + filename)
          }
        })
        fs.rmdirSync(path1)
      } else {
        fs.rmdirSync(path1)
      }
     return true;
    } else {
        
      console.log("Directory path not found.")
      return false;
    }
}

//#region UserFTP
function getUserTextFile(req, res)  { 
    const { path, fileName, user } = req.body;
    if (fileName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    const dir = `allFiles/${user}`;
    fs.readFile(dir + "/" + fileName, { encoding: 'utf-8' }, function(err, fileText) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File does not exist");
            res.send(error);
        } else {
            var response = {
                fileName: fileName,
                text: fileText
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function getUserDirectoryTree(req, res) { 
    const { user } = req.body;
    if (user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let path = `allFiles/${user}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    const tree = dirTree(path, {attributes:['birthtime']});
    res.status(200);
    res.send(tree);
}

async function putFileInUserFolder(req, res) {
    const { path, fileName, base64, user } = req.body;
    if (fileName == undefined || base64 == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let buff = new Buffer.from(base64, 'base64');
    let dir = `allFiles/${user}/${path}`;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            const error = new Error.Error(12, "Unkown error while making directories.")
            res.send(error);
            return;
        } else {
            fs.writeFile(dir + "/" + fileName, buff, function (err) {
                if (err) {
                    console.log("/api/web/user/file/put error: " + err)
                    res.status(404);
                    res.json({ error: err });
                } else {
                    console.log("done");
                    const response = {
                        success: true,
                        message: "File uploaded sucessfully."
                    }
                    res.json(response);
                }
            });
        }
    });

}

async function getFileFromUserFolder(req, res) {
    const { path, fileName, user } = req.body;
    if (fileName == undefined || user == undefined || path == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Body invalid.");
        res.send(error);
        return;
    }
    const fullPath = `allFiles/${user}/${path}/${fileName}`;
    fs.readFile(fullPath, { encoding: 'base64' }, function (err, data) {
        if (err) {
            const error = new Error.Error(11, "File does not exist.");
            res.json(error);
        } else {
            var response = {
                fileName: fileName,
                base64: data
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function renameInUserFolder (req, res) {
    const { path, oldName, newName, user } = req.body;
    
  if (path == undefined || oldName == undefined || newName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }

    let dir = `allFiles/${user}/${path}`;
    
    fs.rename( dir + "/" + oldName, dir + "/" + newName, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File/folder renamed sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function deleteFileFromUserFolder (req, res) {
    const { path, fileName, user } = req.body;
    if (path == undefined || fileName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${user}/${path}`;
    fs.unlink(dir + "/" + fileName, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File does not exist.");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File deleted sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function deleteFolderFromUserFolder (req, res) {
    const { path, folderName, user } = req.body;
    if (path == undefined || folderName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${user}/${path}/${folderName}`;
    let returnValue = removeDir(dir)
    if(returnValue){
        var response = {
            success: true,
            message: "Folder deleted sucessfully."
        }
        res.status = 200;
        res.send(response);
    }else{
        
        const error = new Error.Error(8,"Folder does not exist.");
        res.send(error);
    }
}

function createFolderInUserFolder (req, res) {
    const { path, folderName, user } = req.body;
    if (path == undefined || folderName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${user}/${path}/${folderName}`;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            const error = new Error.Error(12, "Unknown error while making directories.")
            res.send(error);
            return;
        } else {
            const response = {
                success: true,
                message: "Folder created sucessfully."
            }
            res.json(response);
        }
    });
}

function copyInsideUserFolder (req, res) {
    const { oldPath, newPath, name, user } = req.body;
    
    if (oldPath == undefined || newPath == undefined || name == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    
    let oldDir = `allFiles/${user}/${oldPath}/${name}`;
    let newDir = `allFiles/${user}/${newPath}/${name}`;
    
    fse.copy( oldDir, newDir, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File/folder copied sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function moveInsideUserFolder (req, res) {
    const { oldPath, newPath, name, user } = req.body;
    
    if (oldPath == undefined || newPath == undefined || name == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    
    let oldDir = `allFiles/${user}/${oldPath}/${name}`;
    let newDir = `allFiles/${user}/${newPath}/${name}`;

    /*if (!fs.existsSync(oldDir)) {
        const error = new Error.Error(8,"File/folder "+oldDir+"  does not exist1");
        res.send(error);
        return;
    }
    if (!fs.existsSync(newDir)) {
        const error = new Error.Error(8,"File/folder "+newDir+" does not exist2");
        res.send(error);
        return;
    }*/
  
    fse.move( oldDir, newDir, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
    
            var response = {
                success: true,
                message: "File/folder moved sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

//#endregion

//#region AgentFTP
async function getFileFromAgentFolder(req, res) {
    const { deviceUid, path, fileName, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || user == undefined) {
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${deviceUid}`;
    if (fileName === "config.json")
        dir = dir + "/config";
    else
        dir = dir + "/" + path
    fs.readFile(dir + "/" + fileName, { encoding: 'base64' }, function (err, data) {
        if (err) {
            console.log("/api/web/agent/file/get error: " + err)
            const error = new Error.Error(11, "File does not exist.");
            res.json(error);
        } else {
            var response = {
                fileName: fileName,
                base64: data
            }
            res.status = 200;
            res.send(response);
        }
    });
}

async function putFileInAgentFolder(req, res) {
    const { deviceUid, path, fileName, base64, user } = req.body;
    if (deviceUid == undefined || fileName == undefined || base64 == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let buff = new Buffer.from(base64, 'base64');
    let dir = `allFIles/${deviceUid}`;
    if (fileName === "config.json")
        dir = dir + "/config";
    else
        dir = dir + "/" + path;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            res.status(404);
            const error = new Error.Error(12, "Unknown error while making directories.")
            res.send(error);
            return;
        } else {
            fs.writeFile(dir + "/" + fileName, buff, function (err) {
                if (err) {
                    console.log("/api/web/agent/file/put error: " + err)
                    res.status(404);
                    res.json({ error: err });
                    return;
                } else {
                    if (fileName === "config.json") {
                        let ws = WebSocketService.getClient(deviceUid);
                        if (ws == undefined) {
                            const error = new Error.Error(12, "Config saved but agent is not connected.");
                            res.statusCode = 210;
                            res.json(error);
                            return;
                        }
                        var response = {
                            type: "putFile",
                            fileName: fileName,
                            path: "",
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
                        return;
                    } else {
                        res.json({ success: true, message: "Succesfuly uploaded file." });
                    };
                }
            });
        }
    });
}

function getAgentDirectoryTree(req, res) {
    const { deviceUid, user } = req.body;
    if (deviceUid == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(7, "Invalid body.");
        res.send(error);
        return;
    }
    let path = `allFiles/${deviceUid}`;
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    const tree = dirTree(path, {attributes:['birthtime']})
    res.status(200);
    res.send(tree);
}

function getAgentTextFile(req, res)  { 
    const { deviceUid, path, fileName, user } = req.body;
    if (fileName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    const dir = `allFiles/${deviceUid}/${path}`;
    fs.readFile(dir + "/" + fileName, { encoding: 'utf-8' }, function(err, fileText) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File does not exist");
            res.send(error);
        } else {
            var response = {
                fileName: fileName,
                text: fileText
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function renameInAgentFolder (req, res) {
    const {deviceUid, path, oldName, newName, user } = req.body;
    
  if (path == undefined || oldName == undefined || newName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }

    let dir = `allFiles/${deviceUid}/${path}`;
    
    fs.rename( dir + "/" + oldName, dir + "/" + newName, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File/folder renamed sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function deleteFileFromAgentFolder (req, res) {
    const {deviceUid, path, fileName, user } = req.body;
    if (path == undefined || fileName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${deviceUid}/${path}`;
    fs.unlink(dir + "/" + fileName, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File does not exist.");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File deleted sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function deleteFolderFromAgentFolder (req, res) {
    const { deviceUid,path, folderName, user } = req.body;
    if (path == undefined || folderName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${deviceUid}/${path}/${folderName}`;
    let returnValue = removeDir(dir)
    if(returnValue){
        var response = {
            success: true,
            message: "Folder deleted sucessfully."
        }
        res.status = 200;
        res.send(response);
    }else{
        
        const error = new Error.Error(8,"Folder does not exist.");
        res.send(error);
    }
}

function createFolderInAgentFolder (req, res) {
    const {deviceUid, path, folderName, user } = req.body;
    if (path == undefined || folderName == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    let dir = `allFiles/${deviceUid}/${path}/${folderName}`;
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            const error = new Error.Error(12, "Unknown error while making directories.")
            res.send(error);
            return;
        } else {
            const response = {
                success: true,
                message: "Folder created sucessfully."
            }
            res.json(response);
        }
    });
}

function copyInsideAgentFolder (req, res) {
    const {deviceUid, oldPath, newPath, name, user } = req.body;
    
    if (oldPath == undefined || newPath == undefined || name == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    
    let oldDir = `allFiles/${deviceUid}/${oldPath}/${name}`;
    let newDir = `allFiles/${deviceUid}/${newPath}/${name}`;
    
    fse.copy( oldDir, newDir, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
            var response = {
                success: true,
                message: "File/folder copied sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

function moveInsideAgentFolder (req, res) {
    const {deviceUid, oldPath, newPath, name, user } = req.body;
    
    if (oldPath == undefined || newPath == undefined || name == undefined || user == undefined) {
        res.status(400);
        const error = new Error.Error(5,"Invalid body.");
        res.send(error);
        return;
    }
    
    let oldDir = `allFiles/${deviceUid}/${oldPath}/${name}`;
    let newDir = `allFiles/${deviceUid}/${newPath}/${name}`;
  
    fse.move( oldDir, newDir, function(err) {
        if (err) {
            console.log("error: " + err)
            const error = new Error.Error(8,"File/folder does not exist");
            res.send(error);
        } else {
    
            var response = {
                success: true,
                message: "File/folder moved sucessfully."
            }
            res.status = 200;
            res.send(response);
        }
    });
}

//#endregion

module.exports = {
    getFileFromUserFolder,
    getFileFromAgentFolder,
    putFileInUserFolder,
    putFileInAgentFolder,
    getAgentDirectoryTree,
    getUserDirectoryTree,
    getAgentTextFile,
    getUserTextFile,   
    renameInUserFolder,
    deleteFileFromUserFolder,
    deleteFolderFromUserFolder,
    createFolderInUserFolder,
    copyInsideUserFolder,
    moveInsideUserFolder,
    renameInAgentFolder,
    deleteFileFromAgentFolder,
    deleteFolderFromAgentFolder,
    createFolderInAgentFolder,
    copyInsideAgentFolder,
    moveInsideAgentFolder
}