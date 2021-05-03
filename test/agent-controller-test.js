let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server.js');
const WebSocket = require('ws');
const WebSocketService = require('../ws/websocket-service.js');



chai.use(chaiHttp);
let assert = chai.assert;

const deviceIdCookie = "=fc548ecb-12ec-4ad5-8672-9d5a9565ff60";
const deviceId = "fc548ecb-12ec-4ad5-8672-9d5a9565ff60";
let ws;
describe('Agent controller tests',() => {
    before((done) => {
        WebSocketService.addSession(deviceId);  
        ws = new WebSocket('ws://localhost:25565',
        [],
        {
            'headers': {
                'cookie': deviceIdCookie
            }
        }
        );
        ws.on('open', function open() {
            ws.send(JSON.stringify({type: "sendCredentials", name: "Desktop PC 1",  location: "Sarajevo - BBI", deviceUid: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"}));
            done();
        });
        ws.on('message', function incoming(data) {
            const message = JSON.parse(data);
            console.log(message.type)
            if (message.type == "getScreenshot") {
                ws.send(JSON.stringify({type: "sendScreenshot", message: "radi", deviceUid: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"}));
            } else if (message.type == "putFile") {
                ws.send(JSON.stringify({type: "savedFile", message: "radi", deviceUid: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"}));
            } else if(message.type == "getFileDirect") {
                ws.send(JSON.stringify({type: "sendFileDirect", fileName: "text.txt", message: "radi", deviceUid: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"}));
            } else if (message.type == "systemInfo") {
                ws.send(JSON.stringify({type: "sendInfo", message: "radi", deviceUid: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"}));
            }
        });
    });
    after(function(done) {
        if(ws) {
          ws.close();
          console.log("closed");
        } else {
          console.log('No connection to break...');
        }
        done();
    });
    it('2# /api/agents/online - should return one device',(done) => {
        chai.request(server)
        .get("/api/agents/online")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .end((err, res) => {
           assert.equal(200, res.status);
            const array = JSON.parse(JSON.stringify(res.body));
            assert.equal(1,array.length);
            done();
        });
    })
    it('3# /api/agents/online - should return correct device',(done) => {
        chai.request(server)
        .get("/api/agents/online")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .end((err, res) => {
           assert.equal(200, res.status);
            const array = JSON.parse(JSON.stringify(res.body));
            const device = array[0];
            assert.equal("Desktop PC 1", device.name);
            assert.equal("Sarajevo - BBI", device.location);
            assert.equal("fc548ecb-12ec-4ad5-8672-9d5a9565ff60", device.deviceUid);
            done();
        });
    })
    it('4# /api/agents/screenshot - should return error not connected to agent',(done) => {
        chai.request(server)
        .post("/api/agent/screenshot")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {
           assert.equal(350, res.status);
           assert.deepEqual({
            success: false,
            error_id: 4,
            message: 'You are not connected to that agent.'
          },
          res.body);
            done();
        });
    })
    it('5# /api/agents/connect - should return status 200',(done) => {
        chai.request(server)
        .post("/api/agent/connect")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({
            success: true,
            type: 'In use',
            user: 'aayić@aya.com',
            message: 'Connection successful!'
          },
          res.body);
            done();
        });
    })
    it('6# /api/agents/screenshot - should return status 200',(done) => {
        chai.request(server)
        .post("/api/agent/screenshot")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.equal("radi", res.body.message);
            done();
        });
    })
    it('7# /api/agent/file/direct-put - should return status 200',(done) => {
        chai.request(server)
        .post("/api/agent/file/direct-put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId,
            fileName:"text.txt",
            path:"",
            base64:"c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk="})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ type: 'Success', message: 'File saved on agent!' }, res.body);
            done();
        });
    })
    it('8# /api/agent/file/direct-get - should return error not connected to agent',(done) => {
        chai.request(server)
        .post('/api/agent/file/direct-get/')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId,
            fileName:"text.txt",
            path:""})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ fileName: 'text.txt', base64: 'radi' }, res.body);
           done();
        });
    })
    it('9# /api/agent/info/system - should return status 200',(done) => {
        chai.request(server)
        .post('/api/agent/info/system')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {
           assert.equal(200, res.status);
          assert.equal("radi", res.body.message);
           done();
        });
    })
    it('6# /api/agents/disconnect - should return status 200',(done) => {
        chai.request(server)
        .post("/api/agent/disconnect")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({
            type: 'Waiting',
            user: 'aayić@aya.com',
            message: 'User successfully disconnected!'
          },
          res.body)
            done();
        });
    })
    
})