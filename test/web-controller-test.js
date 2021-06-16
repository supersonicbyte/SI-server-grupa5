let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server.js');
chai.use(chaiHttp);
let assert = chai.assert;
const fs = require("fs");
const path = require('path');
const deviceId = "fc548ecb-12ec-4ad5-8672-9d5a9565ff60";


describe('Web controller tests',() => {
    before((done) => {
        try {
            fs.rmdirSync("allFiles", { recursive: true });
            console.log(`allFiles is deleted!`);

        } catch (err) {
            console.error(`Error while deleting ${dir}.`);
        }
        done();
    })
    it('1# /api/web/user/file/put - should return create folder and put file',(done) => {
        chai.request(server)
        .post("/api/web/user/file/put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text1.txt",
        path:"",
        base64:"c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk="})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ success: true, message: 'File uploaded sucessfully.' }, res.body);
           assert.equal(fs.existsSync("./allFiles/aayić@aya.com/text1.txt"), true);
           done();
        });
    })
    it('2# "/api/web/user/file/get" - should return correct file',(done) => {
        chai.request(server)
        .post("/api/web/user/file/get")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text1.txt",
        path:""})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({
            fileName: 'text1.txt',
            base64: 'c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk='
          }, res.body);
           done();
        });
    })
    it('3# /api/web/user/file/get - should return file does not exist',(done) => {
        chai.request(server)
        .post("/api/web/user/file/get")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text22.txt",
        path:""})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ success: false, error_id: 11, message: 'File does not exist.' },res.body);
           done();
        });
    })
    it('4# /api/web/agent/file/put - should put file in agent folder',(done) => {
        chai.request(server)
        .post("/api/web/agent/file/put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text22.txt",
        path:"",
        deviceUid: deviceId,
        base64:"c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk="})
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ success: true, message: 'Succesfuly uploaded file.' },res.body);
           assert.equal(fs.existsSync(`./allFiles/${deviceId}/text22.txt`), true);
           done();
        });
    })
    it('5# /api/web/agent/file/put - should return bad body in request', (done) => {
        chai.request(server)
        .post("/api/web/agent/file/put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text22.txt",
        path:"",
        deviceUid: deviceId,
        })
        .end((err, res) => {
           assert.equal(400, res.status);
           assert.deepEqual({ success: false, error_id: 7, message: 'Invalid body.' },res.body);
           done();
        });
    })
    it('6# /api/web/agent/file/get - should return correct file', (done) => {
        chai.request(server)
        .post('/api/web/agent/file/get')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text22.txt",
        path:"",
        deviceUid: deviceId,
        })
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({
            fileName: 'text22.txt',
            base64: 'c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk='
          },res.body);
           done();
        });
    })
    it('7# /api/web/agent/file/get - should return file does not exists', (done) => {
        chai.request(server)
        .post('/api/web/agent/file/get')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text???.txt",
        path:"",
        deviceUid: deviceId,
        })
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ success: false, error_id: 11, message: 'File does not exist.' },res.body);
           done();
        });
    })
    it('8# /api/web/user/file-tree - should return correct file tree', (done) => {
        chai.request(server)
        .post('/api/web/user/file-tree')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .end((err, res) => {            
           assert.equal(200, res.status);
           assert.equal(1,res.body.children.length);
           done();
        });
    })
    it('9# /api/web/user/file-tree - should return two files', (done) => {
        chai.request(server)
        .post("/api/web/user/file/put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text11.txt",
        path:"",
        base64:"c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk="
        })
        .end((err, res) => {
            chai.request(server)
        .post('/api/web/user/file-tree')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .end((err, res) => {            
           assert.equal(200, res.status);
           assert.equal(2,res.body.children.length);
           done();
        });
        });
    })
    it('10# /api/web/agent/file-tree - should return correct file tree', (done) => {
        chai.request(server)
        .post('/api/web/agent/file-tree')
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send({deviceUid: deviceId})
        .end((err, res) => {  
           assert.equal(200, res.status);
           assert.equal(1,res.body.children.length);
           done();
        });
    })
    it('11# /api/web/agent/file-tree - should return 2 files', (done) => {
        chai.request(server)
        .post("/api/web/agent/file/put")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text11.txt",
        path:"",
        deviceUid: deviceId,
        base64: "c29tZSB0ZXh0IHNvIGl0IGlzbnQgZW1wdHk="
        })
        .end((err, res) => {
            chai.request(server)
            .post('/api/web/agent/file-tree')
            .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
            .send({deviceUid: deviceId})
            .end((err, res) => {  
               assert.equal(200, res.status);
               assert.equal(2,res.body.children.length);
               done();
            });
        });
    })
    it('12# /api/web/user/file/preview - should return file does not exist', (done) => {
        chai.request(server)
        .post("/api/web/user/file/preview")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text??.txt",
        path:"",
        })
        .end((err, res) => {
           assert.equal(200,res.status);
           assert.deepEqual({ success: false, error_id: 8, message: 'File does not exist' },res.body);
           done();
        });
    })
    it('13# /api/web/user/file/preview - should return file preview', (done) => {
        chai.request(server)
        .post("/api/web/user/file/preview")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text11.txt",
        path:"",
        })
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ fileName: 'text11.txt', text: 'some text so it isnt empty' },res.body);
           done();
        });
    })
    it('14# /api/web/agent/file/preview - should return file does not exist', (done) => {
        chai.request(server)
        .post("/api/web/agent/file/preview")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text1?1.txt",
        path:"",
        deviceUid: deviceId
        })
        .end((err, res) => {
           assert.equal(200,res.status);
           assert.deepEqual({ success: false, error_id: 8, message: 'File does not exist' },res.body);
           done();
        });
    })
    it('15# /api/web/user/file/preview - should return file preview', (done) => {
        chai.request(server)
        .post("/api/web/user/file/preview")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text11.txt",
        path:"",
        deviceUid: deviceId
        })
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual({ fileName: 'text11.txt', text: 'some text so it isnt empty' },res.body);
           done();
        });
    })
    it('16# /api/web/user/rename - should return invalid body', (done) => {
        chai.request(server)
        .post("/api/web/user/rename")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .send( {fileName:"text11.txt",
        path:"",
        })
        .end((err, res) => {
           assert.equal(400, res.status);
           console.log(res.body);
           //assert.deepEqual({ fileName: 'text11.txt', text: 'some text so it isnt empty' },res.body);
           done();
        });
    })
})