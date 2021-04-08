const mongoose = require('mongoose');
const Tour = require('./tourModel');

/*
:: Review Schema
  -- rating
  -- createdAt
  -- ref to Tour
  -- ref to User
*/
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    // each time that the data is outputted as JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//## =============== Indexes =============== ##//

// prevent users to create multiple reviews on one tour.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//## =============== pre & post middleware =============== ##//
//- reviewSchema.pre('save', function (next) {
//-   this.populate({
//-     path: 'tour user',
//-     select: '-__v',
//-   });
//-   next();
//- });
// :: ↑ doesn't work for some reason

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  // .populate({
  //   path: 'tour',
  //   select: 'name',
  // });

  next();
});

//## =============== Static methods =============== ##//

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the Model
  // aggregateはarrayを返す
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
      // tourId にマッチするすべてのreviewsを取得
    },
    {
      $group: {
        _id: '$tour',
        numOfRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  // console.log(stats);
  // aggregateはarrayが返り値

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numOfRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 0,
    });
  }
};

//## ========== Review createでTour更新 ========== ##//
// dbにreviewが追加されると, calcAverageRatingsをコールしてtourのratingsQuantityとratingsAverageを新たに計算して変更される
reviewSchema.post('save', async function () {
  // :: const indexes = await this.collection.getIndexes();
  // console.log(indexes);
  // {
  //   _id_: [ [ '_id', 1 ] ],
  //   tour_1_user_1: [ [ 'tour', 1 ], [ 'user', 1 ] ]
  // }

  // this points to the current review
  // this.constructor = Model(= Review)
  await this.constructor.calcAverageRatings(this.tour);
});

//## ========== Review update, deleteでTour更新 ========== ##//
// findByIDAnd...()はbehind the sceneでfindOndAnd...({id:...})と同義なので↓のregexpに有効
reviewSchema.post(/^findOneAnd/, async (doc) => {
  // const review = await this.findOne();
  // postでもthis.findOne()は有効でした
  // console.log(review);
  // console.log(doc);
  // doc === review
  if (doc) await doc.constructor.calcAverageRatings(doc.tour);
});

//## ↑ much simpler much better code

/*
## Jonas's complex code
-  reviewSchema.pre(/^findOneAnd/, async function (next) {
-   this.r = await this.findOne();
-   // console.log(this.r);
-   next();
- });

- reviewSchema.post(/^findOneAnd/, async function () {
-   await this.r.constructor.calcAverageRatings(this.r.tour);
- });
*/

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
