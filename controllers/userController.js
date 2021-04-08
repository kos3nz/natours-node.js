const multer = require('multer');
const sharp = require('sharp'); // ease to use image processing library for node.js
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

//:: =============== Upload a user photo =============== :://

// Since it's not a good practice to save the image in the disk BEFORE RESIZING, I do not use this variable for storage option
// eslint-disable-next-line no-unused-vars
const multerDiskStorage = multer.diskStorage({
  /* file
  {
    fieldname: 'photo',
    originalname: 'leo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    destination: 'public/img/users',
    filename: '0f1768227a385ab64f358d2d9a78df59',
    path: 'public/img/users/0f1768227a385ab64f358d2d9a78df59',
    size: 207078
  }
  */

  // the parameter, cb, works like next()
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    // user-(user.id)-(timestamp).jpegの形式で保存したい
    // user-767767v7a7v7ba-3421847273.jpeg
    const extension = file.mimetype.split('/')[1]; // jpeg
    cb(
      null,
      `user-${req.user.id}-${Date.now()}.${extension}`
    );
  },
});

// this way the image file will be stored as a buffer
// 次のmiddleware(= resizeUserPhoto)でリサイズするため、ディスクに保存せずメモリーに一時保存
const multerMemoryStorage = multer.memoryStorage();

// test if the uploaded file is an image, if so passes true to cb, if not passes false to cb
// can test any kinds of files
const multerFilter = (req, file, cb) => {
  // if the file type is image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Not an image! Please upload only images.',
        400
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerMemoryStorage,
  fileFilter: multerFilter,
  //:: dest: 'public/img/users',
  // dest: where users save their images
  // without this option, an uploaded image will be saved in memory, not in the disc
});

const uploadUserPhoto = upload.single('photo');
// update one single image, and the name of the field that is going to hold the image to upload

const resizeUserPhoto = catchAsync(
  async (req, res, next) => {
    if (!req.file) return next();

    // multerMemoryStorageを使用するため、req.file.filenameがundefinedのままなのでここでassign
    req.file.filename = `user-${
      req.user.id
    }-${Date.now()}.jpeg`;

    // multer.memoryStorage()を使うことでbuffer propertyにアクセスできる
    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.file.filename}`);
    // https://sharp.pixelplumbing.com/api-resize

    next();
  }
);

//:: =============== Helper function =============== :://

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((e) => {
    if (allowedFields.includes(e)) newObj[e] = obj[e];
  });
  return newObj;
};

//:: =============== Route handlers =============== :://

// ## GET
const getAllUsers = factory.getAll(User);

const getUser = factory.getOne(User);

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// ## CREATE

const createUser = (req, res) => {
  res.status(500).json({
    status: 'Error',
    message:
      'This route is not yet defined! Please use /signup instead.',
  });
};

// ## UPDATE

// This function is for administrator
// Do NOT update password with this!!
const updateUser = factory.updateOne(User);

// Only updating for name and email
const updateMe = catchAsync(async (req, res, next) => {
  // multer() middleware を挟むことでreq.fileにアクセスできる
  // console.log(req.file); // upload されたfile
  // console.log(req.body); // file は表示されない

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true, // return new(= updated) Document
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// ## DELETE
// This is for admin
const deleteUser = factory.deleteOne(User);

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    isActive: false,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  uploadUserPhoto,
  resizeUserPhoto,
  getAllUsers,
  getUser,
  getMe,
  createUser,
  updateUser,
  updateMe,
  deleteUser,
  deleteMe,
};
