const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // credit card
    /*
    success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    */
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    // url redirected to as soon as a payment was completed
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    // url redirected to if a user choose to cancel the payment
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    // custom field
    line_items: [
      {
        // all these field names here, they come from Stripe so I cannot make up my own fields
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100, // expected in cents
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// WARNING: This is only TEMPORARY, because it's : everyone can make bookings without paying
/*
const createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;

  // if one of those is undefined or null, go to overview page
  if (!tour || !user || !price) return next();

  await Booking.create({ tour, user, price });

  // create a new request to the new url
  res.redirect(req.originalUrl.split('?')[0]);
  // `/?tour=${ req.params.tourId }&user=${req.user.id}&price=${tour.price}` -> '/'
});
*/

async function createBookingCheckout(session) {
  const tourId = session.client_reference_id;
  const userId = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].amount / 100;

  await Booking.create({ tour: tourId, user: userId, price });
}

const webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook error: ${error.message}`);
    // Stripe will receive this response
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

//## =============== CREATE =============== ##//
const createBooking = factory.createOne(Booking);

//## =============== READ =============== ##//
const getAllBookings = factory.getAll(Booking);
const getBooking = factory.getOne(Booking);

//## =============== UPDATE =============== ##//
const updateBooking = factory.updateOne(Booking);

//## =============== DELETE =============== ##//
const deleteBooking = factory.deleteOne(Booking);

//## =============== EXPORT =============== ##//
module.exports = {
  getCheckoutSession,
  // createBookingCheckout,
  webhookCheckout,
  createBooking,
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
};
