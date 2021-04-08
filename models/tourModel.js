const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

// blueprint of the data (type and config)
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tour must have a name'], // validator
      unique: true, // not validator
      trim: true,
      maxlength: [
        // validator
        40,
        'Tour name must have less than or equal to 40 characters',
      ],
      minlength: [
        // validator
        10,
        'Tour name must have more than or equal to 10 characters',
      ],
      // validate: [
      //   validator.isAlpha, // accepts only [a-zA-Z] chars, not even white spaces
      //   'Tour name must only contain characters',
      // ],
    },
    duration: {
      type: Number,
      required: [true, 'Tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'Tour must have a difficulty'],
      // ↑ shorthand validator ↓ longhand
      enum: {
        // validator for String type
        values: ['easy', 'medium', 'difficult'],
        message:
          'Difficulty is either: easy, medium, or difficult',
      },
    },
    price: {
      type: Number,
      required: [true, 'Tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // ↓ Custom validation
      validate: {
        // NOTE: 'this' points to the current document on NEW document CREATION, which means 'this' won't work on UPDATE
        validator: function (val) {
          return val <= this.price;
        },
        // ({VALUE}) is mongoose internal syntax which accept the argument value from the function
        message:
          'Discount price ({VALUE}) should be below the regular price',
      },
      // -- there is a library called 'validator.js' which takes care of this kind of custom validator and I don't have to write one myself
      // https://github.com/validatorjs/validator.js/
    },
    ratingsQuantity: {
      type: Number,
      default: 4.5,
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [1, 'Rating must be above 1.0'], // validator for Number and Date type
      max: [5, 'Rating must be below 5.0'], // validator for Number and Date type
      set: (val) => Math.round(val * 10) / 10,
      // 4.6666666 → 46.666666 → 47 → 4.7
      // this function is will be run each time the new value is set for this field
    },
    summary: {
      type: String,
      trim: true,
      // trim property only works with string type
      // remove all the white space in the beginning and in the end of the string (like javascript trim method)
      required: [true, 'Tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'Tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // this can hide the property from the response output (only visible in the database)
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // MongoDB uses a special data format called GeoJSON
      // this object here is not a type options object, but an embedded one.
      // NOTE: in order for this object to be recognized as geospatial JSON, the type and the coordinates property are needed.
      type: {
        type: String,
        default: 'Point', // could be 'Polygon', 'Line' or other geometries
        enum: ['Point'],
      },
      coordinates: [Number], // for the latitude and the longitude
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // referencing to the Users
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // each time that the data is outputted as JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//## =============== Indexes =============== ##//
// はじめにsortingしておくことで、performanceが上がる
// 1: ascending -1: descending
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

/* ==============================
NOTE:= virtual method
  -- get() method here means getter
  -- Use regular function syntax so that I can use 'this' keyword, not arrow function. 'this' will be pointing to the current document.
  -- this virtual property is not part of the database, so I cannot use the property in a query
  -- ex. Tour.find({'durationWeeks': '1'}) does not work
============================== */
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate
// tourSchemaをpopulateすることでreviewの項目が加わる
// getOne()にpopulate optionにreviewを加えることでreviewにreferenceすることができる
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id', // this tour's id
});

//## =============== DOCUMENT MIDDLEWARE =============== ##//
//-- pre() runs right 'before' and post() runs right 'after' .save() and .create(), but not .insertMany() , .findByIdAndUpdate() etc..
// mongoose middleware also have next function like express
tourSchema.pre('save', function (next) {
  //-- 'this' points to the currently processing document
  this.slug = slugify(this.name, { lower: true });
  next();
});

//-- middleware(= hook)は何度でも使える
//-- thisを使わないと自動でarrow functionに変更される (by eslint)
// tourSchema.pre('save', (next) => {
//   console.log('Will save document...');
//   next();
// });
// tourSchema.post('save', (doc, next) => {
//   console.log(doc);
//   next();
// });

// ## this is how embedded data is created
// guides: Array, ← TourSchema

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(
//     async (id) => await User.findById(id)
//   );
//   this.guides = await Promise.all(guidesPromises);
// });

//## =============== QUERY MIDDLEWARE =============== ##//
//-- pre() runs right 'before' .find() method in the entire code, but not .findOne()(= findById()) so I need to use regexp in order to also include the method
//-- 'this' points to Query Object
//-- 'find' から regexp に変えたので this.[suggestions] が Query から Document になっている
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); // secretTour: true以外
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(
    `Query took ${Date.now() - this.start} milliseconds`
  );
  // console.log(docs);
  next();
});

//## ============= AGGREGATION MIDDLEWARE ============= ##//
//-- 'this' points to Aggregation Object
tourSchema.pre('aggregate', function (next) {
  // if the first stage is NOT '$geoNear'
  if (Object.keys(this.pipeline()[0])[0] !== '$geoNear') {
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } },
    });
  }
  // console.log(this.pipeline());
  next();
});

// Create an instance class for creating a document
// Always use uppercase on model names and variables
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
