const fs = require('fs');
require('dotenv').config({
  path: './config.env',
});
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection successful');
  });

// Read Json file
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours.json`, 'utf-8')
);
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/users.json`, 'utf-8')
);
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// Import data into DB
async function importData() {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    // with the option, all the validation in the model will just be skipped
    await Review.create(reviews);
    // can accept an array of obj
    console.log('Data successfully imported');
  } catch (error) {
    console.log(error);
  } finally {
    process.exit();
  }
}

// Delete all data from collection
async function deleteData() {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted');
  } catch (error) {
    console.log(error);
  } finally {
    process.exit();
  }
}

//## ========= execute functions with using command line ========= ##//
// console.log(process.argv);
/*
[
  '/Users/me/.nodebrew/node/v14.16.0/bin/node',
  '/Users/me/Desktop/Complete-node-bootcamp/4-natours/dev-data/data/import-dev-data.js',
  '--import' ← the argument that I'm interested in
]
*/
if (process.argv[2] === '--import') importData();
if (process.argv[2] === '--delete') deleteData();
