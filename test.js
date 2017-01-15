let should = require('should');

const PORT = 7777;
const TIMEOUT = 80;

describe('Test javascript parser', () => {
  describe('Parse valid code', () => {
    it('Should be able to parse simple code', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      let code = new Buffer('var foo = require(\'net\');');
      client.on('data', (data) => {
        let uses = JSON.parse(new Buffer(data).toString())['use_count'];
        uses.should.have.property('net');
        uses.should.have.property('require');
        client.end();
        done();
      });
      client.write(JSON.stringify({ code: code.toString('base64') }));
    });
    it('Should timeout if we don\'t send complete json', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      client.write("{\"some\":");
      client.on('data', (data) => {
        should.fail('Should not receive data');
      });
      client.on('timeout', () => {
        client.end();
        done();
      });
    });
    it('Should return an error if we send invalid code', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      let code = new Buffer('get foo = import require(\'net\';);');
      client.on('data', (data) => {
        let response = JSON.parse(new Buffer(data).toString());
        response.should.have.property('error');
        response.should.have.property('message');
        client.end();
        done();
      });
      client.write(JSON.stringify({ code: code.toString('base64') }));
    });
    it('Should allow us to send multiple blobs over the same connection', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      let code = new Buffer('var foo = require(\'net\');');
      let count = 0;
      client.on('data', (data) => {
        let uses = JSON.parse(new Buffer(data).toString())['use_count'];
        uses.should.have.property('net');
        uses.should.have.property('require');
        count += 1;
        if (count == 1) {
          client.write(JSON.stringify({ code: code.toString('base64') }));
        }
        if (count == 2) {
          client.end();
          done();
        }
      });
      client.write(JSON.stringify({ code: code.toString('base64') }));
    });
  });
});
