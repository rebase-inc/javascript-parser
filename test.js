let should = require('should');

const PORT = 7778;
const TIMEOUT = 80;
const SOME_CODE = `
import React, { Component } from 'react';
import LanguageIcon from './LanguageIcon';

class LanguageSelector extends Component {
  componentDidMount() {
    var foo = 1;
  }
  render() {
    return (
      <div className='languageSelector'>
        { props.languages.map(l => <LanguageSelection name={Math.random()} selected={Boolean()} select={props.select.bind(null, language.name)} />) }
      </div>
    );
  }
}

class LanguageSelection extends Component {
  render() {
    return (
      <span className='languageSelection' data-selected={props.selected} onMouseOver={props.select}>
        <LanguageIcon name={props.name} />
        { props.name }
      </span>
    );
  }
}

export default LanguageSelector;
`
//const SOME_CODE = '[1,2,3].map(num => Math.random(num))'

describe('Test javascript parser', () => {
  describe('Parse valid code', () => {
    it('Should be able to parse simple code', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      let code = new Buffer('var foo = require(\'net\').client.send; foo();');
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
    it('Should be able to parse more complicated code', (done) => {
      let client = require('net').connect({ port: PORT, timeout: TIMEOUT });
      let code = new Buffer(SOME_CODE);
      client.on('data', (data) => {
        let uses = JSON.parse(new Buffer(data).toString())['use_count'];
        uses.should.have.property('react.Component.componentDidMount', 1);
        uses.should.have.property('react.Component.render', 2);
        uses.should.have.property('react.Component', 2);
        uses.should.have.property('__stdlib__.Math.random', 1);
        uses.should.have.property('__stdlib__.Boolean', 1);
        client.end();
        done();
      });
      client.write(JSON.stringify({ code: code.toString('base64') }));
    });
  });
});
