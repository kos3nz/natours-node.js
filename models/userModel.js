const crypto = require('crypto'); // built-in Node.js module
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//:: =============== Data Schema =============== :://

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
    trim: true,
    maxlength: [
      30,
      'User name needs to be less than or equal to 30 characters',
    ],
  },
  email: {
    type: String,
    required: [true, 'Please tell us your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password needs at least 8 or more characters'],
    select: false, // removed from the output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // NOTE: This validator only works on "CREATE" and "SAVE"!!! Because validator function is using "this" keyword.
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//:: =============== bcrypt a password =============== :://

userSchema.pre('save', async function (next) {
  // mongoose built-in method, if the modified value is not password
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // hash(_, number) stringで指定もできるがnumberでcost(CPU intensive)の設定もできる(defaultはおそらく10)
  // より高くも設定できるがこれ以上いくと処理が長くなる
  // this hash() is asynchronous and return Promise

  // Delete passwordConfirm field
  // ## この段階でvalidationは通ってるのでpasswordConfirmは必要なくなる
  // NOTE: validation時にチェックされるのはinput時の値なので、データベースにアップするときにはrequiredであったとしても必要ではない
  this.passwordConfirm = undefined;
  next();
});

//:: =============== Update changedPasswordAt when save() runs =============== :://

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // sometimes JWT issued 'before' assigning to this.passwordChangedAt, so just to make sure subtract 1 second.
  this.passwordChangedAt = Date.now() - 1000;

  // console.log(this.passwordChangedAt);

  next();
});

//:: =============== Check Password =============== :://

// create instance method
userSchema.methods.correctPassword = async (candidatePassword, userPassword) =>
  await bcrypt.compare(candidatePassword, userPassword);
// candidatePassword = the password passed from user input (not hashed)
// userPassword = the hashed password
// without compare() function there is no way to compare them
//## since I set the select property to false on password, 'this(Document Object).password' will not be available, and I have to pass the userPassword as an argument.

//:: =============== Check whether the password was changed after JWT creation =============== :://

// WARNING: thisを使うのでarrow functionは使えない
// this keyword in the instance always points to the Document
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }

  // false means NOT changed
  return false;
};

//:: =============== Filter out inactive users =============== :://

// triggered before method that starts with 'find'
// ex. 'find', 'findById', 'findOne', 'findByIdAndUpdate' , etc...
userSchema.pre(/^find/, function (next) {
  this.find({ isActive: { $ne: false } });
  next();
});

//:: =============== Password Reset Token =============== :://

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // Expires in 10min

  // console.log({
  //   resetToken,
  //   passwordResetToken: this.passwordResetToken,
  //   passwordResetExpires: this.passwordResetExpires,
  // });

  // I need to send one token via email, and set the encrypted version in the database
  // NOTE: databaseにsensitive dataを保管するときは必ずencryptする必要がある

  return resetToken;
};

//:: =============== Model =============== :://

const User = mongoose.model('User', userSchema);
// model('String here will be the name of the collection (=> lowercase)')

module.exports = User;
