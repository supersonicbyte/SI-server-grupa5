const express = require('express');
const app = express();
const server = require('http').createServer(app);
const cors = require('cors')
const env = require('dotenv');
const WebSocket = require('ws');
const WebSocketService = require('./ws/websocket-service.js');
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
const swaggerUi = require('swagger-ui-express'),
swaggerDocument = require('./swagger.json');
const websocketLoginController = require('./controllers/websocket-login-controller.js');
const apiValidator = require('./auth/api-validator.js');
const agentValidator = require('./auth/agent-validator.js');
const agentController = require('./controllers/agent-controller.js');
const webController = require('./controllers/web-controller.js');

app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use('/api', apiValidator.apiValidator);
env.config();

app.use('*/agent', agentValidator.agentValidator);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


WebSocketService.configure(wss, server);
/**
* Socket auth
*/
app.post('/login', websocketLoginController.websocketLogin);
/**
*  Agent routes
*/
app.post('/api/agent/command',agentController.executeCommandOnAgent); 
app.get('/api/agents/online', agentController.getOnlineAgents); 
app.post('/api/agent/disconnect', agentController.dissconectAgent); 
app.post('/api/agent/connect', agentController.connectAgent);
app.post('/api/agent/screenshot', agentController.getScreenshot); 
app.post('/api/agent/file/direct-put', agentController.putFileInAgentDirectly);
app.post('/api/agent/file/direct-get', agentController.getFileFromAgentDirectly); 
app.post('/api/agent/info/system', agentController.getInfo);
/**
 * Web routes
 */
app.post('/api/web/user/file/get',webController.getFileFromUserFolder);
app.post('/api/web/agent/file/get', webController.getFileFromAgentFolder); 
app.post('/api/web/user/file/put', webController.putFileInUserFolder);
app.post('/api/web/agent/file/put', webController.putFileInAgentFolder); 
app.post('/api/web/agent/file-tree', webController.getAgentDirectoryTree); 
app.post('/api/web/user/file-tree', webController.getUserDirectoryTree);
app.post('/api/web/agent/file/preview', webController.getAgentTextFile);
app.post('/api/web/user/file/preview', webController.getUserTextFile);

app.post('/api/web/user/rename', webController.renameInUserFolder);
app.post('/api/web/user/file/delete', webController.deleteFileFromUserFolder);
app.post('/api/web/user/folder/delete', webController.deleteFolderFromUserFolder);
app.post('/api/web/user/folder/create', webController.createFolderInUserFolder);
app.post('/api/web/user/copy', webController.copyInsideUserFolder);
app.post('/api/web/user/move', webController.moveInsideUserFolder);

app.post('/api/web/agent/rename', webController.renameInAgentFolder);
app.post('/api/web/agent/file/delete', webController.deleteFileFromAgentFolder);
app.post('/api/web/agent/folder/delete', webController.deleteFolderFromAgentFolder);
app.post('/api/web/agent/folder/create', webController.createFolderInAgentFolder);
app.post('/api/web/agent/copy', webController.copyInsideAgentFolder);
app.post('/api/web/agent/move', webController.moveInsideAgentFolder);

/**
 * Server Agent routes
 */
 app.post('/api/agent/file/get/:folder',agentController.getFileFromAgentToFolder);
 app.post('/api/agent/files/put', agentController.putFilesToAgentFromFolder);
 app.post('/api/agent/file/put', agentController.putFileToAgentFromFolder);


app.get('/', (req, res) => {
    res.send('<h1>Up and running. + CI/CD2</h1>');
})

const PORT = process.env.PORT || 25565;
if(!module.parent) {
    server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

module.exports = app;