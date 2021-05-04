let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../server.js');

chai.use(chaiHttp);
let assert = chai.assert;


describe('Basic test',() => {
    it('#1 - / should return status 200',(done) => {
        chai.request(app)
        .get("/")
        .end((err, res) => {
            assert.equal(200, res.status);
            assert.deepEqual("<h1>Up and running. 1</h1>", res.text);
            done();
        });
    })
    it('#2 - random route without token - should return status 403', (done) => {
        chai.request(app)
        .get("/api/agents/online")
        .end((err, res) => {
            assert.equal(401, res.status);
            assert.deepEqual({
                error_id: 1,
                success: false,
                message: "Token not valid"
            }, res.body);
            done();
        });
    })
    it('3# /api/agents/online - should return empty array', (done) => {
        chai.request(app)
        .get("/api/agents/online")
        .set({ "Authorization": `Bearer ${process.env.UNIQUE_TOKEN}` })
        .end((err, res) => {
           assert.equal(200, res.status);
           assert.deepEqual([], res.body);
            done();
        });
    })
})