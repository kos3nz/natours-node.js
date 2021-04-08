const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

//:: =============== Router =============== :://

const router = express.Router();

//## =============== Protecting Routes =============== ##//
router.use(authController.protectRoutes);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

//## =============== Restricting Routes =============== ##//
router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
