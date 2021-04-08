/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  // Stripe('public_key')
  const stripe = Stripe(
    'pk_test_51IdZAtD24k8wOsaORDd0No2riHXFUqNwGcmwEDaqq0I5PU49KXOcTc0aTzmc1BSzKV5PG2fOguUEaohpKmkasVTe00sUsJjNT2'
  );

  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://localhost:8080/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
