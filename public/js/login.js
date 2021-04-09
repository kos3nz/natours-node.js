/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login', // relative path
      data: {
        email,
        password,
      },
    });

    // console.log(res);

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1000);
    }
    // location.assign()
    // https://developer.mozilla.org/ja/docs/Web/API/Location
  } catch (err) {
    showAlert('error', err.response.data.message);

    // console.log(err.response.data);
    // log the json data from the server
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout', // relative path
    });

    if (res.data.status === 'success') {
      // location.reload(true);
      showAlert('success', 'Logging out...');
      window.setTimeout(() => {
        location.assign('/login');
      }, 1000);
    }
  } catch (err) {
    showAlert('error', 'Failed logging out! Try again.');
  }
};
