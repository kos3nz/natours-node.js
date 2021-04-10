const path = require('path'); // nodejs built-in module
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

//:: =============== Start Express App =============== :://
const app = express();

//:: ============ Global Middleware ============ :://

//:: Setting up Proxy for Heroku server
app.enable('trust proxy');

//:: Setting up Pug Engine
// express supports view engines like pug out of the box
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// path.join() always create a right path
// same as `${__dirname}/views`

//:: Implement CORS (= Cross-Origin Resource Sharing)
app.use(cors());
// Access-Control-Allow-Origin *
// allows all the request no matter where they are coming from

// natours.com -> api.natours.com
/*
app.use(
  cors({
    origin: 'https://www.natours.com',
  })
);
*/
// allows requests only from origin url to api.natours.tom

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

//:: Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//:: Set security HTTP headers
app.use(helmet());

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    },
  })
);

//:: Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//:: Limit requests from same API
const limiter = rateLimit({
  // allow 100 requests from the same IP in 1 hour
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

//:: Stripe Webhook
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);
// Stripe function が req.body は json ではなく raw format である必要があるため body parser の前に置く

//:: Body parser, reading data from body into req.body
// NOTE: req.body にアクセスするために middleware が必要
// if the body is larger than 10kb, It's not accepted
app.use(express.json({ limit: '10kb' }));

// need this urlencoded() middleware to parse data coming form a URL encoded form (submitting data from form element in HTML)
// The extended option allows to pass some more complex data
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// parses data from cookie
app.use(cookieParser());

//:: Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// returns middleware which looks at the request body, the request query string and the request params, and filter all of the dollar signs and dots
// "email": {"$gt": ""} のようなquery injectionを防ぐ

//:: Data sanitization against XSS
app.use(xss());
// cleans any malicious html code
// since mongoose validation also protects from it, it's good practice to add validations to schemas for server side
// "<div id='bad-code'>Test</div>" → "&lt;div id='bad-code'>Test&lt;/div>"

//:: Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'difficulty',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'price',
    ],
    // arrayの中の値がquery keyの場合は作動しない
  })
);
// /api/v1/tours/?sort=duration&sort=-price だと
// requestQueryが{ sort: 'duration,-price' }ではなく
// {sort: ['duration', '-price']}でarrayをpassするためエラーになる
// hpp()を使うことで{ sort: '-price'}にできる

//:: Compress all the text that is sent to clients
// since images(= jpegs) are already compressed, this middleware won't work for them. only works for texts.
app.use(compression());

//:: Test middleware
app.use((req, res, next) => {
  // console.log('Hello from the middleware 😀');
  req.requestTime = new Date().toISOString();

  // console.log(req.cookies);

  // console.log(req.headers);
  // console.log(req.body);
  next();
});

//:: Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//:: If any URL could not be caught by all the route
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'failed',
  //   message: `Can't find ${req.originalUrl}`,
  // });

  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});
// NOTE: any argument passed to next method, Express assumes and treats it as an error. And as soon as Express catches an error, Express will skip all the other middleware in the middleware stack and send the error to the global defined error handling middleware, then it will be executed.
//-- acts like the catch method in Promise.

//:: Error handler middleware
// -- by specifying four parameters, Express automatically knows this entire function is the error handling middleware
app.use(globalErrorHandler);

module.exports = app;
