const net = require('net');

const server = net.createServer((c) => {
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.write('hello\r\n');
    c.pipe(c);
});

server.on('error', (err) => {
    throw err;
});

server.listen(7777, () => {
    console.log('server bound');
});
