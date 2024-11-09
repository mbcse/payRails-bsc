const winston = require('winston')
const { format } = winston
require('winston-daily-rotate-file')
const appRoot = require('app-root-path')
const { OpenTelemetryTransportV3 } = require('@opentelemetry/winston-transport')
const { loggerProvider } = require('../../tracing')

const { printf, timestamp, combine } = format

const myFormat = printf(({ level, message, timestamp, exception, ...meta }) => {
  // return `${timestamp} Exception: ${exception} Level: ${level}: ${message}`
  if (exception) {
    return JSON.stringify({ level: [level], timestamp, exception: exception || false, message: message.split('\n')[0], ...meta })
  } else {
    return JSON.stringify({ level: [level], timestamp, exception: exception || false, message, ...meta })
  }
})

// define the custom settings for each transport (file, console)
const options = {
  file: {
    level: process.env.LOG_LEVEL || 'debug',
    filename: `${appRoot}/logs/app-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    handleExceptions: true,
    json: true,
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    colorize: false
  },
  console: {
    level: process.env.LOG_LEVEL,
    handleExceptions: true,
    json: false,
    colorize: true
  }
}

// instantiate a new Winston Logger with the settings defined above
const logger = winston.createLogger({
  format: combine(
    timestamp({ format: 'DD:MM:YYYY|HH:MM:SS' }),
    myFormat
  ),
  transports: [
    // new winston.transports.DailyRotateFile(options.file),
    new OpenTelemetryTransportV3(
        { loggerProvider: loggerProvider, logResourceLabels: true }
    ),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false // do not exit on handled exceptions
})

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function (message) {
    // use the 'info' log level so the output will be picked up by both transports
    logger.info(message)
  }
}

module.exports = logger
