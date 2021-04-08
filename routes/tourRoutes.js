const express = require('express');
const {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  // checkID,
  // checkBody,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages,
} = require('../controllers/tourController');
const {
  protectRoutes,
  restrictTo,
} = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

//:: =============== READ =============== :://
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// /:x? (optional parameter syntax)

//:: =============== CREATE =============== :://
// app.post('/api/v1/tours', createTour);

//:: =============== UPDATE =============== :://
// app.patch('/api/v1/tours/:id', updateTour);

//:: =============== DELETE =============== :://
// app.delete('/api/v1/tours/:id', deleteTour);

//:: =============== Router =============== :://

const router = express.Router();

// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews
// GET /tour/234fad4/reviews/94832fad

// router
//   .route('/:tourId/reviews')
//   .post(
//     protectRoutes,
//     restrictTo('user'),
//     reviewController.createReview
//   );

router.use('/:tourId/reviews', reviewRouter);

// this works only for tourRouter
// router.param('id', checkID);

// NOTE: I wrote this route at the bottom, it does not work because Express thinks that "/get-5-best" is the ":id" if I have it below it.
router
  .route('/top-5-cheap')
  .get(aliasTopTours, getAllTours);

router.route('/tour-stats').get(getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    protectRoutes,
    restrictTo('admin', 'lead-guide'),
    getMonthlyPlan
  );

router
  .route(
    '/tours-within/:distance/center/:latlng/unit/:unit'
  )
  .get(getToursWithin);
// latlng (= latitude longitude) is specifying the coordinate
// /tours-within?distance-233&center=-40,45&unit=mi
// ↓ this one is much cleaner than this ↑
// /tours-within/233/center/-40,45/unit/mi

router
  .route('/distances/:latlng/unit/:unit')
  .get(getDistances);

router
  .route('/')
  .get(getAllTours)
  .post(
    protectRoutes,
    restrictTo('admin', 'lead-guide'),
    createTour
  );

router
  .route('/:id')
  .get(getTour)
  .patch(
    protectRoutes,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(
    protectRoutes,
    restrictTo('admin', 'lead-guide'),
    deleteTour
  );

module.exports = router;
