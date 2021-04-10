const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

// router.get('/', (req, res) => {
//   // no need to specify the 'pug' extension
//   res.status(200).render('base', {
//     title: 'Exciting tours for adventurous people',
//     user: 'Steven',
//   });
// });

router.use(viewController.alerts);

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.login);
router.get('/me', authController.protectRoutes, viewController.getAccount);
router.get(
  '/my-tours',
  // bookingController.createBookingCheckout,
  authController.protectRoutes,
  viewController.getMyTours
);

/* WITHOUT API
router.post(
  '/submit-user-data',
  authController.protectRoutes,
  viewController.updateUserData
);
*/

module.exports = router;
