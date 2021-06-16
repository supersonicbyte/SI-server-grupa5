let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../server.js');

chai.use(chaiHttp);
let assert = chai.assert;


describe('Agent login tests',() => {
    it('1# /login - should return status 200', (done) => {
        chai.request(app)
        .post("/login")
        .send({id: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"})
        .end((err, res) => {
            assert.equal(200, res.status);
            done();
        });
    })
    it('2# /login - should return status 200', (done) => {
        chai.request(app)
        .post("/login")
        .send({id: "invalid-id"})
        .end((err, res) => {
            assert.equal(200, res.status);
            done();
        });
    })
})