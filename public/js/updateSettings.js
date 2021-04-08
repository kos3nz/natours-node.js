/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

// updateSettings
// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const param =
      type === 'password' ? 'updateMyPassword' : 'updateMe';
    // /updateMe にアクセスする前に protectRoutes() を通る
    const res = await axios({
      method: 'PATCH',
      url: `http://localhost:8080/api/v1/users/${param}`,
      data,
      // data: {name: ..., email: ...}
    });
    if (res.data.status === 'success') {
      showAlert(
        'success',
        `${type.toUpperCase()} updated successfully`
      );
      return 'succeeded';
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
    return 'failed';
  }
};
