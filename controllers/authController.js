const crypto = require('crypto'); // built-in Node.js module
const { promisify } = require('util'); // node.js built-in module
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

//:: =============== Helper Functions =============== :://

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    // change milliseconds to days
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //:: secure: true,
    // the cookie will only be sent on an encrypted connection (= https)
    httpOnly: true,
    // the cookie cannot be accessed or modified in any way by the browser
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

//:: =============== Sing up =============== :://

const signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  // ↑ this line of code has a security flow (there might be a case that the req.body contains any malicious code)
  // ↓ secured code
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  // req.protocol = 'http' | 'https', req.get('host') = 'localhost:8080' | 'www.natours.io'

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

//:: =============== Log in =============== :://

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  // .select('-name'); マイナスで取り除く
  //:: findOne() does not contain password property(since I put 'select: false' on password property in UserSchema), so I need to explicitly select in order to get password value

  // const isCorrect = await user.correctPassword(
  //   password,
  //   user.password
  // );
  //## 上記のコードだとuserがnullの場合、correctPassword()が実行できないため、下記のコードに訂正

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError('Incorrect email or password', 401)
      // 401 = unauthorized
    );
    //## (!user || !isCorrect) と同時にチェックしエラーメッセージを抽象的にすることで(emailが存在しないか、passwordが間違っているのか)アタッカーに何が問題かを絞らせない
  }

  // 3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

const logout = (req, res) => {
  res.cookie('jwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    // no need set the secure property to true, because there is no sensitive data in it
  });

  res.status(200).json({
    status: 'success',
  });
};

//:: =============== Protecting Routes =============== :://

const protectRoutes = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in! Please log in to get access',
        401 // unauthorized
      )
    );
  }

  // 2) Token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //:: jwt.verify() requires callback function as a third parameter so it can run right after the verification is completed but since I have been working with Promises, I used built-in method, promisify, which make the function return a promise, and this way I can use async await syntax
  // console.log(decoded);
  // { id: '605dfd1a5421fc19221ae922', iat: 1616833590, exp: 1619425590 }
  // iat: issued at, exp: expiration date

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token does no longer exist', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password. Please log in again.',
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  // console.log(req.user);
  // this data will be available at later point
  // console.log(req.user.id);
  // console.log(req.user._id);
  // ↑ same outputs
  res.locals.user = currentUser;
  next();
});

//:: =============== Check if a user is logged in on the browser =============== :://
// Since this middleware is only for rendering pages, not to protect any route, there will never be an error. Thus, there is no need to wrap with catchAsync() function.

const isLoggedIn = async (req, res, next) => {
  // Since the authorization header is only for API, the browser only needs cookies
  if (req.cookies.jwt) {
    try {
      // 1) Token verification
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // res.locals.variable ← pug templates will get access it
      // console.log(currentUser);
      res.locals.user = currentUser;
      return next();
    } catch {
      return next();
    }
  }
  next();
};

//:: =============== Restriction =============== :://

const restrictTo = (...roles) =>
  // roles ['admin', 'lead-guide']
  (req, res, next) => {
    // restrictTo middlewareの前にprotectRoutes middlewareを通っているので、reqのvalueが引き継がれている(req.userを使える)
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          403 // = forbidden
        )
      );
    }

    next();
  };

//:: =============== Forgotten Password =============== :://

const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
  });

  if (!user) {
    return next(
      new AppError('There is no user with the email address you provided', 404)
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // :: ↑の段階ではmodifyされただけで、dbに保管されていない
  await user.save({ validateBeforeSave: false });
  // validateBeforeSave deactivates all the validators

  // 3) Send it to user's email
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
      // ここで絶対にresetTokenを返すなどしてはいけない
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Tray again later',
        500
      )
    );
  }
});

//:: =============== Reset Password =============== :://

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    // check if the token is expired
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // since this time I need to validate the data, I don't pass any option into the save() method
  // ここで userSchema.pre('save') によってpasswordがbcryptされる
  // NOTE: ここでupdate()ではなくsave()なのはpasswordConfirm validationと、userSchema.pre() を行う必要があるため。( update()ではvalidatorが走らない ) passwordに関連しているときが必ずsave()を使用する。

  // 3) Update changedPasswordAt property for the user
  // managed by the userSchema.pre('save')

  // 4) Log the user in , send JWT
  createSendToken(user, 201, res);
});

//:: =============== Check Password =============== :://

const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');
  // protectRoutes middleware を通っているからreq.userが使える

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.password, user.password))) {
    return next(new AppError('Your current password is not correct', 401));
  }

  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();
  // User.findByIdAndUpdate() will NOT work as intended

  // 4) Log user in, send JWT
  createSendToken(user, 201, res);
});

module.exports = {
  signup,
  login,
  logout,
  protectRoutes,
  isLoggedIn,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
};
