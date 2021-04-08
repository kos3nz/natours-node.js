/* eslint-disable */
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

//:: =============== DOM ELEMENT =============== :://
const mapbox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

//:: =============== DELEGATION =============== :://
if (mapbox) {
  const locations = JSON.parse(mapbox.dataset.locations);
  displayMap(locations);
}

//:: =============== LOG IN =============== :://
if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

//:: =============== LOG OUT =============== :://
if (logOutBtn) logOutBtn.addEventListener('click', logout);

//:: =============== UPDATE USER DATA =============== :://
if (userDataForm)
  userDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-data').textContent = 'Updating...';

    // fileに対応するため form-data object が必要
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    await updateSettings(form, 'data');
    // ajax call using axios will recognize this form as an object, and works just the same as below

    // const name = document.getElementById('name').value;
    // const email = document.getElementById('email').value;
    // updateSettings({ name, email }, 'data');

    document.querySelector('.btn--save-data').textContent = 'Save Settings';

    location.reload();
  });

//:: =============== UPDATE USER PASSWORD =============== :://
if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const password = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password').value;
    const newPasswordConfirm = document.getElementById('password-confirm')
      .value;

    const res = await updateSettings(
      { password, newPassword, newPasswordConfirm },
      'password'
    );

    if (res === 'succeeded') {
      document.getElementById('password-current').value = '';
      document.getElementById('password').value = '';
      document.getElementById('password-confirm').value = '';
    }

    document.querySelector('.btn--save-password').textContent = 'Save Password';
  });

//:: =============== Booking Button =============== :://

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    // In Javascript, data attribute, 'data-tour-id', in HTML can be converted to dataset.tourId
    //:: const tourId = e.target.dataset.tourId;
    // JS destructuring
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

/* ==============================
NOTE:= DevTools failed to load SourceMap: Could not load content for http://localhost:8080/bundle.js.map: HTTP error: status code 404, net::ERR_HTTP_RESPONSE_CODE_FAILURE について
  -- At very bottom in bundle.js
  -- //# sourceMappingURL=/bundle.js.map
  --                  ↓
  -- //# sourceMappingURL=/js/bundle.js.map
  -- で消える
  -- "build:js": "parcel build ./public/js/index.js --out-dir ./public/js/ --out-file bundle.js" に --public-url /js を加えても消える
============================== */
