//## ========== Put methods into Class ========== ##//

class HandleQuery {
  constructor(Query, requestQuery) {
    this.query = Query;
    this.requestQuery = requestQuery;
  }

  //## Filtering, Advanced Filtering
  filter() {
    const queryObj = { ...this.requestQuery };
    const excludeFields = [
      'page',
      'sort',
      'limit',
      'fields',
    ];

    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));
    // Query.prototype.find()
    // https://mongoosejs.com/docs/api/query.html#query_Query-find

    return this;
  }

  //## Sorting
  sort() {
    if (this.requestQuery.sort) {
      const sortBy = this.requestQuery.sort
        .split(',')
        .join(' ');
      this.query = this.query.sort(sortBy);
      // sort=duration,price => sort('duration price')
      // sort duration first, price second
    } else {
      // 何もsortに指定がない場合、Tourが作成された順↓に設定
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  //## Fields limiting
  limit() {
    if (this.requestQuery.fields) {
      const fields = this.requestQuery.fields
        .split(',')
        .join(' '); // bug
      this.query = this.query.select(fields);
      // this.query = this.query.select('name price duration');
    } else {
      this.query = this.query.select('-__v');
      // __v is always provided by mongoose
      // - (minus operator) excludes the property
    }

    return this;
  }

  //## Pagination
  paginate() {
    const page = +this.requestQuery.page || 1;
    const limit = +this.requestQuery.limit || 100;
    const skip = (page - 1) * limit;

    // page=2&limit=10, page1 (1-10 of results), page2 (11-20), page3...
    // skip 10 results in order to get the 11th result because the request is asking the page 2 (11-20)
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = HandleQuery;

//:: BUILD QUERY
//## 1A) Filtering
// const queryObj = { ...req.query };
// const excludeFields = [
//   'page',
//   'sort',
//   'limit',
//   'fields',
// ];
// excludeFields.forEach((el) => delete queryObj[el]);
// console.log(queryObj);
// { duration: '5', difficulty: 'easy' }
// ?duration[gte]=5 => { duration: { gte: 5 }}

//## 1B) Advanced Filtering
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(
//   /\b(gte|gt|lte|lt)\b/g,
//   (match) => `$${match}`
// );
// console.log(JSON.parse(queryStr));
// { difficulty: 'easy', duration: { '$gte': '5' }

// NOTE: ここでawaitを使用するとpromise(Query object)ではなくan array of objectsが返ってきてしまうので、その後sort(),select()などのmethod(chaining)が使えなくなってしまう
// let query = Tour.find(JSON.parse(queryStr));

// const query = Tour.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy')
//   .where('price')
//   .lte(400);

//## 2) Sorting
// if (req.query.sort) {
//   const sortBy = req.query.sort.split(',').join(' ');
//   query = query.sort(sortBy);
//   // sort=duration,price => sort('duration price')
//   // sort duration first, price second
// } else {
//   // 何もsortに指定がない場合、Tourが作成された順↓に設定
//   query = query.sort('-createdAt');
// }

//## 3) Fields limiting
// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields);
//   // query = query.select('name price duration');
// } else {
//   query = query.select('-__v');
//   // __v is always provided by mongoose
//   // - (minus operator) excludes the property
// }

//## 4) Pagination
// const page = +req.query.page || 1;
// const limit = +req.query.limit || 100;
// const skip = (page - 1) * limit;

// if (req.query.page) {
//   // Model.countDocuments() returns the number of the documents
//   const numTours = await Tour.countDocuments();
//   if (skip >= numTours)
//     throw new Error('This page does not exist');
// }

// // page=2&limit=10, page1 (1-10 of results), page2 (11-20), page3...
// // skip 10 results in order to get the 11th result because the request is asking the page 2 (11-20)
// query = query.skip(skip).limit(limit);
