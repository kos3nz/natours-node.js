class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4')
      ? 'fail'
      : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
    // https://nodejs.org/api/errors.html#errors_error_capturestacktrace_targetobject_constructoropt
  }
}

module.exports = AppError;

/* ==============================
NOTE:= Errors Types
  ## Operational Error:
    -- Exceptions, that caused by the users, the system or the network, might happen at some point, so we need to handle them in advance
    -- Invalid path accessed
    -- Invalid user input (validator error from mongoose)
    -- Failed to connect to server or database
    -- Request timeout
    -- etc...
  ## Programing Error:
    -- Bugs that we developers introduce into or code. Difficult to find and handle.
    -- Reading properties on undefined
    -- Passing a number where an object is expected
    -- Using await without async
    -- Using req.query instead of req.body
    -- Using res.body without middleware
    -- etc...
============================== */
