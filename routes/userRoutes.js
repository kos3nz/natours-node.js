const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

//:: ========== Router ========== :://

const router = express.Router();

//## For sign up and log in

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

//## For password

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protectRoutes);
//:: ====== Protect all routes after this point ====== :://

router.patch('/updateMyPassword', authController.updatePassword);

//## For other information
router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

//## CRUD users

router.use(authController.restrictTo('admin'));
//:: ====== Only admin can operate for users after this point ====== :://

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
