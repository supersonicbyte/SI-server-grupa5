let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../server.js');

const AdminToken = require('../models/admin-token.js');
const fetch = require('node-fetch');


chai.use(chaiHttp);
let assert = chai.assert;


describe('Agent login tests',() => {
    it('1# /login - should return status 200', (done) => {
        chai.request(app)
        .post("/login")
        .send({id: "fc548ecb-12ec-4ad5-8672-9d5a9565ff60"})
        .end((err, res) => {
            assert.equal(200, res.status);
            assert.deepEqual({message: 'Session updated'}, res.body);
            done();
        });
    })
    it('2# /login - should return status 200', (done) => {
        chai.request(app)
        .post("/login")
        .send({id: "invalid-id"})
        .end((err, res) => {
            assert.equal(400, res.status);
            assert.deepEqual({error: 'Id not valid!'}, res.body);
            done();
        });
    })
})