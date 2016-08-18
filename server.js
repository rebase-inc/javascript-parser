const net = require('net');

process.on('SIGTERM', () => {
    console.log('Received signal SIGTERM');
    process.exit(0);
})

process.on('SIGINT', () => {
    console.log('Received signal SIGINT');
    process.exit(0);
})

connected = console.log.bind(this, 'client connected');
disconnected = console.log.bind(this, 'client disconnected');
done_writing = console.log.bind(this, 'done writing');

var json_fragment = '';

const server = net.createServer((c) => {
    connected();
    c.on('end', disconnected);
    c.on('data', (data) => {
        json_chunks = data.toString().split('\n')
        json_chunks[0] = json_fragment+json_chunks[0];
        json_chunks.forEach( (chunk) => {
            if (chunk) {
                try {
                 var call = JSON.parse(chunk);
                 server.emit('method_call', c, call);
                } catch(error) {
                    json_fragment = chunk;
                }
            }
        });
    });
});

function scan_contents(filename, code, date) {
    return {};
};

function scan_patch(filename, code, previous_code, date) {
    return {};
};

var methods = [ scan_contents, scan_patch ];

server.on('method_call', (connection, call) => {
    // 'call' is an array whose first element is the method index in 'methods'
    // and the rest of the array is the sequence of arguments to the method.
    // See protocol in README.md
    console.log('method call: ', call);
    if (connection.destroyed) {
        console.log('Could not process this call, connection is destroyed');
        return;
    }
    let method = methods[call[0]];
    let args = call.slice(1);
    result =  method.apply(this, args);
    result_as_json = JSON.stringify(result);
    console.log('about to write: %s', result_as_json);
    flushed = connection.write(result_as_json+'\n', done_writing);
    console.log('Flushed: %s', flushed);
});

server.on('error', (err) => {
    throw err;
});

server.listen(7777, () => {
    console.log('server listening on 7777');
});


