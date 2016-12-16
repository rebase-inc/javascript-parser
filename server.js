const net = require('net');
const analyze = require('./analyze.js');
const readline = require('readline');

process.on('SIGTERM', process.exit.bind(this, 0))
process.on('SIGINT', process.exit.bind(this, 0))

const PORT = process.env.PORT || 7777;

const server = net.createServer((socket) => {
  readline.createInterface(socket, socket).on('line', (line) => {
    var b64data = line.toString().trim();
    var code = new Buffer(b64data, 'base64').toString();
    var useCount = analyze(code);
    console.log(useCount);
  });
});

server.listen(PORT, () => {
    console.log('server listening on ' + PORT);
});
