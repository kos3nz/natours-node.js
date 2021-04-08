const Review = require('../models/reviewModel');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

//:: =============== Route Handlers =============== :://

//:: GET
const getAllReviews = factory.getAll(Review);

const getReview = factory.getOne(Review);

//:: CREATE
const setTourUserIds = catchAsync(
  async (req, res, next) => {
    // Allow nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;

    // Check whether the tour exists or not
    if (!(await Tour.findById(req.body.tour))) {
      return next(new AppError("Can't find the tour", 404));
    }

    next();
  }
);

const createReview = factory.createOne(Review);

// :: UPDATE
const updateReview = factory.updateOne(Review);

// :: DELETE
const deleteReview = factory.deleteOne(Review);

module.exports = {
  getAllReviews,
  getReview,
  setTourUserIds,
  createReview,
  updateReview,
  deleteReview,
};
