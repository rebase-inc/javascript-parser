const net = require('net');

const protocol = require('./protocol.js');

process.on('SIGTERM', process.exit.bind(this, 0))
process.on('SIGINT', process.exit.bind(this, 0))


disconnected = console.log.bind(this, 'client disconnected');
done_writing = console.log.bind(this, 'done writing');

json_fragment = '';

function timestamp() {
    console.log(new Date().toISOString());
}

const server = net.createServer((c) => {
    console.log('%s\tNew connection with: address:%s, port: %s',
                new Date().toISOString(),
                c.remoteAddress,
                c.remotePort
               );
    c.on('end', disconnected);
    c.on('data', (data) => { 
        console.log('Received:');
        console.log(data.toString());
        json_chunks = data.toString().split('\n');
        json_chunks[0] = json_fragment+json_chunks[0];
        json_fragment = '';
        json_chunks.forEach( (chunk) => {
            if (chunk) {
                try {
                    var call = JSON.parse(chunk);
                    server.emit('method_call', c, call);
                } catch(error) {
                    console.log('Found error while parsing JSON chunk:\n%s\nError: %o', chunk, error);

                    json_fragment = chunk;
                }
            }
        });
    });
});

function on_flush (connection) {
    timestamp();
    console.log('Data was flushed for (%s, %s)', connection.remoteAddress, connection.remotePort);
}

server.on('method_call', (connection, call) => {
    // 'call' is an array whose first element is the method index in 'methods'
    // and the rest of the array is the sequence of arguments to the method.
    // See protocol in README.md
    if (connection.destroyed) {
        console.log('Could not process this call, connection is destroyed');
        return;
    }
    timestamp();
    console.log('Method call from: address:%s, port: %s', connection.remoteAddress, connection.remotePort);
    result_as_json = JSON.stringify(protocol.run(call));
    timestamp();
    console.log('Result:');
    console.log(result_as_json);
    flushed = connection.write(result_as_json+'\n', on_flush.bind(this, connection));
    timestamp();
    console.log('Flushed: %s', flushed);
});

server.on('error', (err) => {
    throw err;
});

server.listen(7777, () => {
    console.log('server listening on 7777');
});


