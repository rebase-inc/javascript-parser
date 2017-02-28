const os = require('os');
const logger = require('winston');
require('winston-rsyslog2');

logger.add(logger.transports.Rsyslog, {
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toLowerCase() : 'debug',
  levelMapping: logger.config.syslog.levels,
  host: 'logserver',
  port: 514,
  tag: 'JavascriptParser',
  messageProvider: (level, msg, meta) => msg.substring(0,900)
});

module.exports = logger;
