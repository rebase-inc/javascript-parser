const net = require('net');

process.on('SIGTERM', () => {
    console.log('Received signal SIGTERM');
    process.exit(0);
})

process.on('SIGINT', () => {
    console.log('Received signal SIGINT');
    process.exit(0);
})

const server = net.createServer((c) => {
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.on('data', (data) => {
        method_call = JSON.parse(data);
        c.write(JSON.stringify(run(method_call)));
    });
});

server.on('error', (err) => {
    throw err;
});

server.listen(7777, () => {
    console.log('server listening on 7777');
});

function scan_contents(filename, code, date) {
    return {};
};

function scan_patch(filename, code, previous_code, date) {
    return {};
};

methods = [ scan_contents, scan_patch ];

function run(call) {
    console.log('method call: ', call);
    let method = methods[call[0]];
    let args = call.slice(1);
    return method.apply(this, args);
};
