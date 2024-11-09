const HTTP_STATUS_CODES = require('./HTTP_STATUS_CODE')
const logger = require('../logger.js')

const successResponse = (res, message, data) => {
  const response = {
    status: 'success',
    message
  }

  if (data) {
    response.data = data
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.OK).send(response)
}

const serverErrorResponse = (res, error, data) => {
  const response = {
    status: 'error',
    message: error.toString(),
    error_code: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    data // or optional error payload
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send(response)
}

const validationErrorResponse = (res, errors, data) => {
  const response = {
    status: 'error',
    message: errors.toString(),
    error_code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
    data // or optional error payload
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json(response)
}

const badRequestErrorResponse = (res, error, data) => {
  const response = {
    status: 'error',
    message: error.toString(),
    error_code: HTTP_STATUS_CODES.BAD_REQUEST,
    data // or optional error payload
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.BAD_REQUEST).send(response)
}

const authorizationErrorResponse = (res, error, data) => {
  const response = {
    status: 'error',
    message: error.toString(),
    error_code: HTTP_STATUS_CODES.UNAUTHORIZED,
    data // or optional error payload
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.UNAUTHORIZED).send(response)
}

const notFoundErrorResponse = (res, error, data) => {
  const response = {
    status: 'error',
    message: error.toString(),
    error_code: HTTP_STATUS_CODES.NOT_FOUND,
    data // or optional error payload
  }

  logger.debug('Response Sent: ' + JSON.stringify(response))

  res.status(HTTP_STATUS_CODES.NOT_FOUND).send(response)
}

module.exports = {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
  badRequestErrorResponse,
  authorizationErrorResponse,
  notFoundErrorResponse
}
