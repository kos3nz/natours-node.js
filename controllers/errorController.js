const AppError = require('../utils/appError');

const handleDuplicateFieldDB = (err) => {
  const message = `Duplicate field value: '${err.keyValue.name}'. Please try different value.`;
  return new AppError(message, 400);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const message = 'Invalid input data: ';
  const messages = Object.values(err.errors).reduce(
    (a, c) => `${a + c.message}. `,
    message
  );
  console.log(messages);

  return new AppError(messages, 400);
};

const handleInvalidJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleExpiredJWTError = () =>
  new AppError(
    'Your token has expired. Please log in again!',
    401
  );

//:: =============== DEVELOPMENT MODE =============== :://

const sendErrorDev = (err, req, res) => {
  //## ============= For API Routes ============= ##//
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      error: err,
      name: err.name,
      status: err.status,
      message: err.message,
      stack: err.stack, // will show where the error occurs
    });
  }

  //## ========== For Rendered Websites ========== ##//
  console.error('Error 💥', err);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message,
  });
};

//:: =============== PRODUCTION MODE =============== :://

const sendErrorProd = (err, req, res) => {
  //## ============= For API Routes ============= ##//
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      //:: Operational, trusted error: send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message || 'No message',
      });
    }
    //:: Programing or other unknown error: don't leak error details
    // 1) Log error
    console.error('Error 💥', err);

    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }

  //## ========== For Rendered Websites ========== ##//
  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  } else {
    res.status(500).render({
      title: 'Something went wrong',
      msg: 'Please try again later',
    });
  }
};

//:: =============== ERROR HANDLER =============== :://

// NOTE: as soon as the next method catches an error, this middleware function triggers and return Error object
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // = internal server error
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    /* 'CastError'
    { statusCode: 404, status: 'fail', isOperational: true }
    */
    /* 'MongoError'
    {
      driver: true,
      name: 'MongoError',
      index: 0,
      code: 11000,
      keyPattern: { name: 1 },
      keyValue: { name: 'The Forest Hiker' },
      statusCode: 500,
      status: 'error'
    }
    */
    /* 'ValidationError'
    {
      "errors": {
        "difficulty": {
          "name": "ValidatorError",
          "message": "Difficulty is either: easy, medium, or difficult",
          "properties": {
            "message": "Difficulty is either: easy, medium, or difficult",
            "type": "enum",
            "enumValues": [
              "easy",
              "medium",
              "difficult"
            ],
            "path": "difficulty",
            "value": "eaaaaaaaaaasy"
          },
          "kind": "enum",
          "path": "difficulty",
          "value": "eaaaaaaaaaasy"
        },
        "ratingsAverage": {
          "name": "ValidatorError",
          "message": "Rating must be below 5.0",
          "properties": {
            "message": "Rating must be below 5.0",
            "type": "max",
            "max": 5,
            "path": "ratingsAverage",
            "value": 33
          },
          "kind": "max",
          "path": "ratingsAverage",
          "value": 33
        }
      },
      "_message": "Tour validation failed",
      "statusCode": 500,
      "status": "error",
      "name": "ValidationError",
      "message": "Tour validation failed: difficulty: Difficulty is either: easy, medium, or difficult, ratingsAverage: Rating must be below 5.0"
    },
    */

    error.name = err.name;
    error.message = err.message;
    // WARNING: 'CastError'時にerrをcopyしてもname, messageなどのpropertyがない（消えてる？）ので個別にsetする必要がある

    // console.log('Error as an argument: ', error);

    // mongoose error
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    // MongoDB error
    if (error.code === 11000) {
      error = handleDuplicateFieldDB(error);
    }
    // mongoose error
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    // JWT Token error
    if (error.name === 'JsonWebTokenError') {
      error = handleInvalidJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleExpiredJWTError();
    }

    // console.log('Returned error: ', error);
    sendErrorProd(error, req, res);
  }
};

module.exports = globalErrorHandler;
