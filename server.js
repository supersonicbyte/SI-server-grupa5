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
//app.use('/api', apiValidator.apiValidator);
env.config()

app.use('/api/*/agent', agentValidator.agentValidator);
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
app.get('/api/agent/online', agentController.getOnlineAgents); 
app.post('/api/agent/disconnect', agentController.dissconectAgent); 
app.post('/api/agent/connect', agentController.connectAgent);
app.post('/api/agent/screenshot', agentController.getScreenshot); 
app.post('/api/agent/file/get',agentController.getFile);
app.post('/api/agent/file/put', agentController.putFile); 
app.post('/api/agent/file/direct-put', agentController.putFileInAgentFolderDirectly);
app.post('/api/agent/file/direct-get', agentController.getFileFromAgentFolderDirectly); 
/**
 * Web routes
 */
app.post('/api/web/user/file/get',webController.getFileFromUserFolder);
app.post('/api/web/agent/file/get', webController.getFileFromAgentFolder); 
app.post('/api/web/user/file/put', webController.putFileInUserFolder);
app.post('/api/web/agent/file/put', webController.putFileInAgentFolder); 
app.post('/api/web/agent/file-tree', webController.getAgentDirectoryTree); 
app.post('/api/web/user/file-tree', webController.getUserDirectoryTree);
app.post('/api/web/agent/file/get-text', webController.getAgentTextFile);
app.post('/api/web/user/file/get-text', webController.getUserTextFile);
app.post('/api/web/user/rename', webController.renameInUserFolder);
app.post('/api/web/user/file/delete', webController.deleteFileFromUserFolder);
app.post('/api/web/user/folder/delete', webController.deleteFolderFromUserFolder);
app.post('/api/web/user/folder/create', webController.createFolderInUserFolder);


app.get('/', (req, res) => {
    res.send('<h1>Up and running.</h1>');
})

const PORT = process.env.PORT || 25565;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));