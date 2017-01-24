const os = require('os');
const net = require('net');
const readline = require('readline');

//const logger = require('./log.js');
const logger = {
  'info': console.log.bind(console),
  'error': console.log.bind(console),
  'debug': console.log.bind(console)
}
const analyze = require('./analyze.js');

process.title = os.hostname();
process.on('SIGTERM', process.exit.bind(this, 0))
process.on('SIGINT', process.exit.bind(this, 0))

const PORT = process.env.PORT || 7778;
const server = net.createServer((socket) => {
  let address = socket.address();
  address.address = address.address.replace(/^.*:/, ''); // IPv4/IPv6 Hybrid socket format fix
  let partialData = '';
  socket.on('data', (data) => {
    partialData += data.toString();
    try {
      var b64code = JSON.parse(partialData).code;
      partialData = ''; // so we can receive another blob on this same socket
    } catch (err) {
      if (err instanceof SyntaxError) {
        return;
      }
      else {
        partialData = '';
        logger.error('Error parsing json : ' + err.message);
        return;
      }
    }
    let start = process.hrtime();
    let code = new Buffer(b64code, 'base64').toString();
    try {
      let useCount = analyze(code);
      let duration = (process.hrtime(start)[1] / 1000000000).toFixed(2)
      socket.write(JSON.stringify({ use_count: useCount, analysisTime: duration }), 'UTF8');
    } catch (err) {
      console.log(err);
      socket.write(JSON.stringify({ error: 1, message: err.message }), 'UTF8');
    }
  });
  socket.on('close', (err) => {
    if (err) {
      logger.error('Connection to ' + address.address + ' on port ' + address.port + ' closed due to transmission error!');
    } else {
      logger.debug('Connection to ' + address.address + ' on port ' + address.port + ' closed');
    }
  });
});

server.listen(PORT, () => {
  logger.info('Server listening on ' + PORT);
});
