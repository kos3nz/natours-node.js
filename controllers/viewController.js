const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      "Thank you for booking our tour! Please check your email for confirmation. If your booking doesn't show up here immediately, please come back later.";

  next();
};

const getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const allTours = await Tour.find();

  // 2) Build template @overview.pug

  // 3) Render that template using tour data from 1)

  res.status(200).render('overview', {
    title: 'All Tours',
    tours: allTours,
  });
});

const getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({
    slug: req.params.slug,
  }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) return next(new AppError('There is no tour with this name.', 404));
  // console.log(tour);

  // 2) Build template

  // 3) Render template using data from 1)
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    // )
    .render('tour', {
      title: tour.name,
      tour,
    });
});

const login = (req, res, next) => {
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "connect-src 'self' https://cdnjs.cloudflare.com"
    // )
    .render('login', {
      title: 'Log into your account',
    });
};

const getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

const getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((doc) => doc.tour);
  // select all the tours which have an ID which is in the tourIDs array
  const myTours = await Tour.find({ _id: { $in: tourIDs } });

  // 3) render the page
  res.status(200).render('overview', {
    title: 'My tours',
    tours: myTours,
  });
});

//:: =============== WITHOUT API =============== :://

const updateUserData = catchAsync(async (req, res, next) => {
  // console.log('UPDATING USER:', req.body);
  // this won't work without express.urlencoded() → 'UPDATING USER: {}'

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
      // this way updates the data safely and protect from malicious input
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser, // overridden? the req.locals.user variable from protectRoutes()
  });
});
// :: With API ver. は updateSetting.js

module.exports = {
  alerts,
  getOverview,
  getTour,
  login,
  getAccount,
  getMyTours,
  updateUserData,
};
