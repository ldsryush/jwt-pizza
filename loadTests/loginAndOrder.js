import { sleep, check, group, fail } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 virtual users
    { duration: '2m', target: 5 },    // Hold at 5 virtual users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
};

// Replace BASE_URL with your actual pizza service domain before running
const BASE_URL = 'https://pizza-service.cs329.click';
const FACTORY_URL = 'https://pizza-factory.cs329.click';

export default function () {
  const vars = {};

  group('Login', () => {
    const response = http.put(
      `${BASE_URL}/api/auth`,
      JSON.stringify({ email: 'd@jwt.com', password: 'diner' }),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      }
    );

    if (
      !check(response, {
        'login status equals 200': (r) => r.status === 200,
      })
    ) {
      console.log(response.body);
      fail('Login was not 200');
    }

    vars.authToken = response.json('token');
    sleep(1);
  });

  group('Get Menu', () => {
    const response = http.get(`${BASE_URL}/api/order/menu`, {
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${vars.authToken}`,
      },
    });

    check(response, {
      'menu status equals 200': (r) => r.status === 200,
    });

    sleep(2);
  });

  group('Buy Pizza', () => {
    const response = http.post(
      `${BASE_URL}/api/order`,
      JSON.stringify({
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          Authorization: `Bearer ${vars.authToken}`,
        },
      }
    );

    if (
      !check(response, {
        'order status equals 200': (r) => r.status === 200,
      })
    ) {
      console.log(response.body);
      fail('Order was not 200');
    }

    vars.pizzaJwt = response.json('jwt');
    sleep(1);
  });

  group('Verify Pizza', () => {
    const response = http.post(
      `${FACTORY_URL}/api/order/verify`,
      JSON.stringify({ jwt: vars.pizzaJwt }),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      }
    );

    check(response, {
      'verify status equals 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Logout', () => {
    const response = http.del(`${BASE_URL}/api/auth`, null, {
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${vars.authToken}`,
      },
    });

    check(response, {
      'logout status equals 200': (r) => r.status === 200,
    });

    sleep(1);
  });
}
