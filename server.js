const os = require('os');
const net = require('net');
const readline = require('readline');

const logger = require('./log.js');
const analyze = require('./analyze.js');

process.title = os.hostname();
process.on('SIGTERM', process.exit.bind(this, 0))
process.on('SIGINT', process.exit.bind(this, 0))

const PORT = process.env.PORT || 7777;
const server = net.createServer((socket) => {
  let address = socket.address();
  address.address = address.address.replace(/^.*:/, ''); // IPv4/IPv6 Hybrid socket format fix
  logger.debug('Got new connection from ' + address.address + ' via port ' + address.port);
  let partialData = '';
  socket.on('data', (data) => {
    partialData += data.toString();
    try {
      var b64code = JSON.parse(partialData).code;
      partialData = ''; // so we can receive another blob on this same socket
    } catch (err) {
      if (err instanceof SyntaxError) {
        logger.debug('Encountered incomplete JSON...waiting for more data from client');
        return;
      }
      else {
        partialData = '';
        logger.error('Got error parsing code: ' + err.message);
        return;
      }
    }
    let start = process.hrtime();
    let code = new Buffer(b64code, 'base64').toString();
    let useCount = analyze(code);
    let duration = (process.hrtime(start)[1] / 1000000000).toFixed(2)
    socket.write(JSON.stringify({ use_count: useCount, analysisTime: duration }), 'UTF8', () => logger.debug('Analysis data successfully sent to client'));
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
