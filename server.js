const net = require('net');

const protocol = require('./protocol.js');

process.on('SIGTERM', process.exit.bind(this, 0))
process.on('SIGINT', process.exit.bind(this, 0))


connected = console.log.bind(this, 'client connected');
disconnected = console.log.bind(this, 'client disconnected');
done_writing = console.log.bind(this, 'done writing');

json_fragment = '';

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


server.on('method_call', (connection, call) => {
    // 'call' is an array whose first element is the method index in 'methods'
    // and the rest of the array is the sequence of arguments to the method.
    // See protocol in README.md
    if (connection.destroyed) {
        console.log('Could not process this call, connection is destroyed');
        return;
    }
    result_as_json = JSON.stringify(protocol.run(call));
    flushed = connection.write(result_as_json+'\n');
});

server.on('error', (err) => {
    throw err;
});

server.listen(7777, () => {
    console.log('server listening on 7777');
});


