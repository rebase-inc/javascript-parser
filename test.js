let should = require('should');

const PORT = 7778;
const TIMEOUT = 80;

const { REACT_CODE, D3_CODE, FETCH_CODE, COMMONJS_CODE } = require('./code.js');

describe('Test javascript parser', () => {
  it('Should be able to parse simple code', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer('var foo = require(\'net\').client.send; var bar = foo();');
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('net.client.send', 1);
      delete uses.net;
      uses.should.be.empty;
      client.end();
      done();
    });
    client.write(JSON.stringify({ code: code.toString('base64') }));
  });
  it('Should timeout if we don\'t send complete JSON', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    client.write("{\"some\":");
    client.on('data', (data) => {
      should.fail('should not receive data');
    });
    client.on('timeout', () => {
      client.end();
      done();
    });
  });
  it('should return an error if we send invalid code', (done) => {
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
  it('should allow us to send multiple blobs over the same connection', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer('var foo = require(\'net\'); foo()');
    let count = 0;
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('net', 1);
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
  it('should be able to parse jsx react code', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer(REACT_CODE);
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('react.Component', 2);
      uses.should.have.property('react.Component.render', 2);
      uses.should.have.property('react.Component.componentDidMount', 1);
      uses.should.have.property('__stdlib__.Math.random', 1);
      uses.should.have.property('__stdlib__.Boolean', 1);
      client.end();
      done();
    });
    client.write(JSON.stringify({ code: code.toString('base64') }));
  });
  it('should be able to parse more complicated code', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer(D3_CODE);
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('d3.select', 7);
      uses.should.have.property('__stdlib__.Math.ceil', 1);
      uses.should.have.property('lodash.range', 1);
      client.end();
      done();
    });
    client.write(JSON.stringify({ code: code.toString('base64') }));
  });
  it('should be able to parse deeply nested functions', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer(FETCH_CODE);
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('__stdlib__.process.env.NODE_ENV', 1);
      uses.should.have.property('__stdlib__.console', 1);
      uses.should.have.property('__stdlib__.console.warn', 1);
      uses.should.have.property('__stdlib__.console.log', 1);
      uses.should.have.property('__stdlib__.Object.assign', 1);
      uses.should.have.property('__stdlib__.JSON.stringify', 1);
      uses.should.have.property('isomorphic-fetch', 1);
      client.end();
      done();
    });
    client.write(JSON.stringify({ code: code.toString('base64') }));
  });
  it('Should be able to parse complicated commonjs code', (done) => {
    let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
    let code = new Buffer(COMMONJS_CODE);
    client.on('data', (data) => {
      let uses = JSON.parse(new Buffer(data).toString())['use_count'];
      uses.should.have.property('events.EventEmitter.prototype', 1);
      uses.should.have.property('underscore.extend', 1);
      uses.should.have.property('flux.Dispatcher.register', 1);
      uses.should.have.property('flux.Dispatcher', 1);
      uses.should.have.property('__stdlib__.Object.defineProperty', 2);
      uses.should.have.property('__stdlib__.console.warn', 16);
      client.end();
      done();
    });
    client.write(JSON.stringify({ code: code.toString('base64') }));
  });
});
