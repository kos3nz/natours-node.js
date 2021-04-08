const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const HandleQuery = require('../utils/handleQuery');

//## =============== CREATE =============== ##//

const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const createdDocument = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        document: createdDocument,
      },
    });
  });

//## =============== READ =============== ##//

const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // :: Only for nested GET reviews on tour (hack)
    const filter = req.params.tourId ? { tour: req.params.tourId } : {};
    // if there is no params filter(= {}) will be passed and find all the review in the db

    //:: EXECUTE QUERY
    const features = new HandleQuery(Model.find(filter), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();
    // Model.find()
    // https://mongoosejs.com/docs/api.html#model_Model.find
    // console.log(req.query);
    // { duration: '5', difficulty: 'easy', page: '2', sort: '1', limit: '10'}

    const documents = await features.query;
    // const documents = await features.query.explain();
    // identical to query.sort(...).select(...).skip(...).limit(...)

    //:: SEND RESPONSE
    res.status(200).json({
      status: 'success',
      requestAt: req.requestTime,
      results: documents.length,
      data: { documents },
    });
  });

const getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    const document = !populateOptions
      ? await Model.findById(req.params.id)
      : await Model.findById(req.params.id).populate(populateOptions);

    // let query = Model.findById(req.params.id);
    // if (populateOptions) query = query.populate(populateOptions);
    // const document = await query;

    // const tour = await Tour.findById(req.params.id).populate('reviews');
    // .populate({
    // path: 'guides',
    // select: '-__v -passwordChangedAt',
    // });
    // findById() is equivalent to 'Tour.findOne({ _id: req.params.id })';
    // In database, guides contain only references, but with populate() method they are filled up with the actual data
    // NOTE: behind the scene, using populate() creates a new query, thus using it tons of times in a huge application might affects performance

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { document },
    });
  });

//## =============== UPDATE =============== ##//

const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDocument = await Model.findByIdAndUpdate(
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

    if (!updatedDocument) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        document: updatedDocument,
      },
    });
  });

//## =============== DELETE =============== ##//

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const deletedDocument = await Model.findByIdAndDelete(req.params.id);

    if (!deletedDocument) {
      return next(new AppError('No document found with that ID', 404));
    }

    // server should not return any data when deleting operation
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

module.exports = {
  createOne,
  getAll,
  getOne,
  updateOne,
  deleteOne,
};
