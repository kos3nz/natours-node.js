// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp'); // ease to use image processing library for node.js

const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

//## ========== Refactor with catchAsync ========== ##//

//:: =============== Uploading multiple images : Tour =============== :://

const multerMemoryStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerMemoryStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
// single file for 1 field.
// upload.single('image'); => req.file
// multiple files for 1 field
// upload.array('images', 3); => req.files
// for mix of multiple fields
// upload.fields({}, {}); => req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // req.files で取得したデータは maxCount: 1 でもarray
  // console.log(req.files);

  if (!req.files.imageCover || !req.files.images) {
    return next();
  }

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3(= width) : 2(= height) ratio
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // https://sharp.pixelplumbing.com/api-resize

  // 2) Images
  req.body.images = await Promise.all(
    // map(async()=>{})で array of promise を返す
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333) // 3(= width) : 2(= height) ratio
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      return filename;
    })
  );

  next();
});

//:: ======== Aggregation pipeline: Matching and Grouping ======== :://

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      // 条件にmatchするdocuments
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      // 条件にmatchしたdocumentsの中からfieldのavg,min,maxの値を取得
      $group: {
        // _id: null,
        // _id: '$difficulty', // 指定したfieldでgrouping
        _id: { $toUpper: '$difficulty' }, // make it uppercase s
        numberOfTours: { $sum: 1 }, // the number of the documents
        numberOfRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      // $groupで新たにつくったpropertyしか使えない
      $sort: { avgPrice: 1 }, // 1 = ascending, -1 = descending
    },
    // {
    //   // can use $match multiple times
    //   $match: { _id: { $ne: 'EASY' } }, // $ne(= not equal to) = 'MEDIUM DIFFICULT'
    // },
  ]);

  // console.log(stats);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

//:: ===== Aggregation pipeline: Unwinding and Projecting ===== :://

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
      // {$field : [value1, value2, value3]} → {$field: value1}, {$field: value2}, {$field: value3}
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numberOfTours: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      // groupに新たなfieldを追加
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 }, // 1 = show, 0 = hide,
    },
    {
      $sort: { month: 1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

//:: =============== Geospatial Queries: Finding Tours Within Radius =============== :://

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [latitude, longitude] = latlng.split(',');

  if (!latitude || !longitude)
    next(new AppError('Please provide your coordinate.', 400));

  const radiusOfEarthInMiles = 3958.8;
  const radiusOfEarthInKms = 6371;

  const radius =
    unit === 'mi'
      ? distance / radiusOfEarthInMiles
      : distance / radiusOfEarthInKms;

  // 自分のlocationから半径(= distance)の距離以内にあるツアーを検索
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radius],
        // in GEO Json, longitude comes first
      },
    },
  });
  // $geoWithin の他にも $near などもある
  // https://docs.mongodb.com/manual/reference/operator/query-geospatial/

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

//:: ====== Geospatial Aggregation: Calculating Distances ====== :://

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [latitude, longitude] = latlng.split(',');

  if (!latitude || !longitude)
    next(new AppError('Please provide your coordinate.', 400));

  const oneMeterInMile = 0.000621371;
  const oneMeterInKm = 0.001;
  const multiplier = unit === 'mi' ? oneMeterInMile : oneMeterInKm;

  const distances = await Tour.aggregate([
    {
      /* ==============================
        NOTE:= geoNear
          -- is the only geospatial aggregation pipeline.
          -- always needs to be the first stage in the pipeline.
          -- requires at least one of the fields that contains a geospatial index
          -- on tourSchema, startLocation already has the '2dsphere' geospatial index
          ## if there's only one field with a geospatial index, $geoNear stage will automatically use the index. However, if there're multiple, then I need to use the key parameter in order to define the field that I want to use for calculations
          -- will be calculated in meters
        ============================== */
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+longitude, +latitude],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // show the output in km
        // equivalent to (meter * 1000)
      },
    },
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { distances },
  });
});

//:: =============== Alias Handler =============== :://

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price';
  req.query.fields = 'name,price,ratingAverage,difficultly,summary';
  next();
};

//:: =============== Get Handler =============== :://

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, {
  path: 'reviews',
  select: '-__v',
});

//:: =============== Post Handler =============== :://

exports.createTour = factory.createOne(Tour);

//:: =============== Update Handler =============== :://

exports.updateTour = factory.updateOne(Tour);

//:: =============== Delete Handler =============== :://

exports.deleteTour = factory.deleteOne(Tour);

//## ========== Connecting to MongoDB with mongoose ========== ##//

//:: ===== Aggregation pipeline: Matching and Grouping ===== :://
/*
exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        // 条件にmatchするdocuments
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        // 条件にmatchしたdocumentsの中からfieldのavg,min,maxの値を取得
        $group: {
          // _id: null,
          // _id: '$difficulty', // 指定したfieldでgrouping
          _id: { $toUpper: '$difficulty' }, // make it uppercase s
          numberOfTours: { $sum: 1 }, // the number of the documents
          numberOfRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        // $groupで新たにつくったpropertyしか使えない
        $sort: { avgPrice: 1 }, // 1 = ascending, -1 = descending
      },
      // {
      //   // can use $match multiple times
      //   $match: { _id: { $ne: 'EASY' } }, // $ne(= not equal to) = 'MEDIUM DIFFICULT'
      // },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'Failed',
      message: error,
    });
  }
};
*/
//:: ===== Aggregation pipeline: Unwinding and Projecting ===== :://
/*
exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = +req.params.year;

    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
        // {$field : [value1, value2, value3]} → {$field: value1}, {$field: value2}, {$field: value3}
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numberOfTours: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        // groupに新たなfieldを追加
        $addFields: { month: '$_id' },
      },
      {
        $project: { _id: 0 }, // 1 = show, 0 = hide,
      },
      {
        $sort: { month: 1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'Failed',
      message: error,
    });
  }
};
*/
//:: =============== Alias Handler =============== :://
/*
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price';
  req.query.fields =
    'name,price,ratingAverage,difficultly,summary';
  next();
};
*/
//:: =============== Get Handler =============== :://
/*
exports.getAllTours = async (req, res) => {
  try {
    // console.log(req.query);
    // { duration: '5', difficulty: 'easy', page: '2', sort: '1', limit: '10'}

    //:: EXECUTE QUERY
    const features = new HandleQuery(Tour.find(), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();
    // Model.find()
    // https://mongoosejs.com/docs/api.html#model_Model.find
    const tours = await features.query;
    // identical to query.sort(...).select(...).skip(...).limit(...)

    //:: SEND RESPONSE
    res.status(200).json({
      status: 'success',
      requestAt: req.requestTime,
      results: tours.length,
      data: { tours },
    });
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: err,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    // eslint-disable-next-line prettier/prettier
    const tour = await Tour.findById(req.params.id);
    // equivalent to 'Tour.findOne({ _id: req.params.id })';

    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: err,
    });
  }
};
 */
//:: =============== Post Handler =============== :://
/*
exports.createTour = async (req, res) => {
  try {
    // const newTour = new Tour()
    // newTour.save()
    //:: ↑ ↓ outputは共に同じで Promise を返すが、staticで直接 call するのと instance を作り prototype method を使うことの違いがある :://
    console.log(req.body);

    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'Created',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'Failed',
      message: err,
    });
  }
};
*/
//:: =============== Update Handler =============== :://
/*
exports.updateTour = async (req, res) => {
  try {
    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        // return the updated document rather than the original. defaults to false
        runValidators: true,
        // validate the document of the schema
        // updating value の [type,required,maxlength,etc...]  が schema と違っていた場合エラー
        // implicit cohesion できる場合は no error?
        // -- runValidators を設定していないと、update時に validator が走らず、そのままアップデートされてしまう
      }
    );

    res.status(200).json({
      status: 'Updated',
      data: {
        tour: updatedTour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: err,
    });
  }
};
*/
//:: =============== Delete Handler =============== :://
/*
exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    // server should not return any data when deleting operation
    res.status(204).json({
      status: 'Deleted',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'Failed',
      message: err,
    });
  }
};
*/

//## ========== Connecting with Json data ========== ##//

//:: ============ Top Level Codes ============ :://
/*
// -- Json data を使って testing
const tours = JSON.parse(
  fs.readFileSync(
    `${__dirname}/../dev-data/data/tours-simple.json`
  )
);
*/
//:: =============== Route handlers =============== :://

// :: Check handlers
/*
// -- MongoDB will take care this id check
exports.checkID = (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);
  // val = :id

  // if (+req.params.id < 0 || +req.params.id >= tours.length) {
  if (val < 0 || val >= tours.length) {
    return res.status(404).json({
      status: 'Failed',
      message: 'Invalid id',
    });
    // :: make sure to RETURN the response object!
  }
  next();
};

// -- mongoose will take care the missing properties
exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'Failed',
      message: 'Missing name or price',
    });
  }
  next();
};
*/
// :: GET handlers
/*
exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    results: tours.length,
    data: { tours },
  });
};

exports.getTour = (req, res) => {
  console.log(req.params);
  console.log(typeof req.params.id); // string

  const id = +req.params.id;
  const tour = tours.find((e) => e.id === id);

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
};
*/
// :: POST handlers
/*
exports.createTour = (req, res) => {
  console.log(req.body);
  :: req.body will need middleware to read

  const newId = tours[tours.length - 1].id + 1;
  const newTour = {
    id: newId,
    ...req.body,
  };

  // ==============================
  NOTE:= Wrote below code in package.json to tell which version of node or higher so that no error will be showing when I use spread properties
    "engines": {
      "node": ">=10.6.0"
    }
  ============================== //

  tours.push(newTour);

  fs.writeFile(
    `${__dirname}/../dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    () => {
      res.status(201).json({
        status: 'Created',
        data: {
          tour: newTour,
        },
      });
    }
  );
};
*/
// :: PATCH handlers
/*
exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'Updated',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};
*/
// :: DELETE handlers
/*
exports.deleteTour = (req, res) => {
  // 204 = No content
  res.status(204).json({
    status: 'Deleted',
    data: null,
  });
};
*/
//## ===== the other way of exporting multiple variables ===== ##//
/*
module.exports = {
getAllTours,
getTour,
createTour,
updateTour,
deleteTour,
};
*/
