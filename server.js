const os = require('os');
const net = require('net');
const babylon = require('babylon');
const cluster = require('cluster');

const logger = require('./log.js');
const analyze = require('./analyze.js');

const PLUGINS = [
  'jsx',
  'flow',
  'doExpressions',
  'objectRestSpread',
  'decorators',
  'classProperties',
  'exportExtensions',
  'asyncGenerators',
  'functionBind',
  'functionSent',
  'dynamicImport'
]

const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {

      logger.info(`Master ${process.pid} is running`);

      function killAllWorkersAndExit() {
          for (const id in cluster.workers) {
              cluster.workers[id].kill();
          }
          process.exit(0);
      }

      process.on('SIGTERM', killAllWorkersAndExit);
      process.on('SIGINT', killAllWorkersAndExit);

      for (let i = 0; i < numCPUs; i++) {
          cluster.fork();
      }

} else {

    logger.info(`Worker ${process.pid} started`);
    process.title = `Worker ${process.pid}`;
    process.on('SIGTERM', process.exit.bind(this, 0))
    process.on('SIGINT', process.exit.bind(this, 0))

    const PORT = process.env.PORT || 7777;
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
                var ast = babylon.parse(code, { sourceType: 'module', allowReturnOutsideFunction: true, plugins: PLUGINS });
            } catch (err) {
                socket.write(JSON.stringify({ error: 1, message: err.message }), 'UTF8');
                return;
            }

            try {
                let useCount = analyze(ast);
                let duration = (process.hrtime(start)[1] / 1000000000).toFixed(2)
                socket.write(JSON.stringify({ use_count: useCount, analysisTime: duration }), 'UTF8');
            } catch (err) {
                logger.error(err.message);
                socket.write(JSON.stringify({ error: 2, message: 'Parser Error!: ' + err.message }), 'UTF8');
                //throw err;
                return;
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
        logger.info(`Worker ${process.pid} listening on ` + PORT);
    });
}

