import { test, expect } from 'playwright-test-coverage';

test('home page', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await expect(page.locator('h2')).toContainText("The web's best pizza");
});

test('home page with user logged in', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });
  
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  await page.reload();
  
  await expect(page.locator('h2')).toContainText("The web's best pizza");
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('about page shows content', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();
});

test('history page shows content', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.locator('h2')).toContainText('Mama Rucci');
});

test('404 page shows error', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/nonexistent-page-12345');
  await expect(page.locator('h2')).toContainText('Oops');
});

test('docs page loads', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({ 
      json: { 
        version: '1.0.0',
        endpoints: [
          { method: 'GET', path: '/api/order/menu', requiresAuth: false, description: 'Get the pizza menu', example: 'curl localhost:3000/api/order/menu', response: [] }
        ] 
      } 
    });
  });
  
  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: 'JWT Pizza API' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Get the pizza menu');
});

test('register new user', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      const req = route.request().postDataJSON();
      await route.fulfill({ 
        json: { 
          user: { id: 4, name: req.name, email: req.email, roles: [{ role: 'diner' }] },
          token: 'test-token' 
        } 
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('test@test.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();
  
  await expect(page.getByRole('link', { name: 'TU' })).toBeVisible();
});

test('register with error', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ 
        status: 400,
        json: { message: 'Email already exists' }
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('test@test.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();
  
  // Should stay on register page after error
  await expect(page.locator('h2')).toContainText('Welcome to the party');
});

test('login user', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ 
        json: { 
          user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
          token: 'test-token' 
        } 
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('logout user', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  await page.reload();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('view menu page', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
        { id: 3, title: 'Margarita', image: 'pizza3.png', price: 0.0014, description: 'Essential classic' },
      ]
    });
  });
  
  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }, { id: 5, name: 'Provo' }] },
      ]
    });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await expect(page.getByText('Veggie')).toBeVisible();
  await expect(page.getByText('Pepperoni')).toBeVisible();
  await expect(page.getByText('Margarita')).toBeVisible();
});

test('view diner dashboard', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });
  
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          dinerId: 3,
          orders: [
            {
              id: 1,
              franchiseId: 1,
              storeId: 4,
              date: '2024-01-01T00:00:00.000Z',
              items: [
                { menuId: 1, description: 'Veggie', price: 0.0038 },
                { menuId: 2, description: 'Pepperoni', price: 0.0042 }
              ],
            },
          ],
          page: 1,
        }
      });
    }
  });
  
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.locator('h2')).toContainText('Your pizza kitchen');
  await expect(page.locator('main')).toContainText('Kai Chen');
  await expect(page.locator('main')).toContainText('d@jwt.com');
  await expect(page.locator('main')).toContainText('0.008');
});

test('diner dashboard with no orders', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });
  
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          dinerId: 3,
          orders: [],
          page: 1,
        }
      });
    }
  });
  
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  await page.goto('/diner-dashboard');
  await expect(page.locator('h2')).toContainText('Your pizza kitchen');
});

test('login failure shows error', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ 
        status: 401,
        json: { message: 'Invalid credentials' }
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('wrong@jwt.com');
  await page.getByPlaceholder('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Should stay on login page
  await expect(page.locator('h2')).toContainText('Welcome back');
});

test('register validation', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  
  // Try to submit without filling fields - buttons should be present
  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
});

test('menu navigation', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  
  // Navigate through all menu items
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.locator('h2')).toContainText("The web's best pizza");
  
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();
  
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.locator('h2')).toContainText('Mama Rucci');
});

test('footer links present', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  
  // Check footer elements exist
  await expect(page.getByText('© 2024 JWT Pizza')).toBeVisible();
});

test('navigate to order page from home', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });
  
  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });
  
  await page.goto('/');
  
  // Click order button on home page
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
});


test('checkout flow', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        json: { order: { id: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }], franchiseId: 1, storeId: 4 }, jwt: 'valid-jwt' }
      });
    } else {
      await route.continue();
    }
  });

  await page.route('*/**/api/order/verify', async (route) => {
    await route.fulfill({
        json: { message: 'valid', payload: { vendor: { id: 'LotaPizza', name: 'LotaPizza' }, diner: { id: 3, name: 'Kai Chen', email: 'd@jwt.com' } } }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  
  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  
  const select = page.locator('select');
  await expect(select).toBeVisible(); 
  // Wait for store option to be populated
  await expect(page.locator('option[value="4"]')).toBeVisible();

  await select.selectOption('4');

  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page.locator('h2')).toContainText('So worth it');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.locator('h2')).toContainText('Here is your JWT Pizza!');
  
  await expect(page.getByText('valid-jwt')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.locator('#hs-jwt-modal')).toContainText('JWT Pizza - valid');
  await page.getByRole('button', { name: 'Close' }).click();
});

test('payment failure', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        json: { message: 'Payment failed' }
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });
  
  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');

  await expect(page.locator('select')).toBeVisible();
  await expect(page.locator('option[value="4"]')).toBeVisible();

  await page.locator('select').selectOption('4');
  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Payment failed')).toBeVisible();
});

test('admin dashboard', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          franchises: [
            {
              id: 1,
              name: 'LotaPizza',
              admins: [{ name: 'Admin', email: 'a@jwt.com' }],
              stores: [{ id: 4, name: 'Lehi', totalRevenue: 100 }]
            }
          ],
          more: false,
        }
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.reload();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByText('Lehi')).toBeVisible();
});

test('create franchise', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { franchises: [], more: false } });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        json: { id: 2, name: 'NewPizza', admins: [{ email: 'new@jwt.com' }], stores: [] }
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await expect(page.locator('h2')).toContainText('Create franchise');
  
  await page.getByPlaceholder('franchise name').fill('NewPizza');
  await page.getByPlaceholder('franchisee admin email').fill('new@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
});

test('close franchise', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
      await route.fulfill({
        json: {
          franchises: [
            { id: 1, name: 'LotaPizza', admins: [{ name: 'Admin', email: 'a@jwt.com' }], stores: [] }
          ],
          more: false,
        }
      });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'deleted' } });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.reload();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click(); 
  
  await expect(page.locator('h2')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
});

test('close store', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
      await route.fulfill({
        json: {
          franchises: [
            { id: 1, name: 'LotaPizza', admins: [{ name: 'Admin', email: 'a@jwt.com' }], stores: [{ id: 4, name: 'Lehi', totalRevenue: 100 }] }
          ],
          more: false,
        }
      });
  });

  await page.route('*/**/api/franchise/*/store/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'deleted' } });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.reload(); // App needs to detect token
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Close' }).nth(1).click();
  
  await expect(page.locator('h2')).toContainText('Sorry to see you go');
  await expect(page.getByText('Lehi')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
});

test('franchisee create store', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 2, name: 'Franchisee', email: 'f@jwt.com', roles: [{ role: 'franchisee' }] }
    });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
            { id: 1, name: 'LotaPizza', admins: [{ id: 2, name: 'Franchisee', email: 'f@jwt.com' }], stores: [] }
        ]
      });
    } else {
        await route.continue();
    }
  });

  await page.route('*/**/api/franchise/*/store', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { id: 5, name: 'New Store', totalRevenue: 0 } });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token');
  });
  await page.goto('/franchise-dashboard');
  
  await page.getByRole('button', { name: 'Create store' }).click();
  await expect(page.locator('h2')).toContainText('Create store');
  
  await page.getByPlaceholder('store name').fill('New Store');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('LotaPizza')).toBeVisible();
});

test('delivery page with invalid jwt verification', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/verify', async (route) => {
    await route.fulfill({
      status: 400,
      json: { message: 'invalid', payload: { error: 'invalid JWT' } }
    });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          order: { id: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }], franchiseId: 1, storeId: 4 },
          jwt: 'invalid-jwt',
        }
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });

  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');

  await expect(page.locator('select')).toBeVisible();
  await expect(page.locator('option[value="4"]')).toBeVisible();
  await page.locator('select').selectOption('4');

  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page.locator('h2')).toContainText('So worth it');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.locator('h2')).toContainText('Here is your JWT Pizza!');
  await expect(page.getByText('invalid-jwt')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.locator('#hs-jwt-modal')).toContainText('JWT Pizza - invalid');
});

test('delivery page order more button', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });

  await page.getByRole('link', { name: 'Order' }).click();
  await page.locator('select').selectOption('4');
  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByRole('button', { name: 'Order more' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
});

test('payment page with multiple pizzas', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });

  await page.getByRole('link', { name: 'Order' }).click();
  await page.locator('select').selectOption('4');
  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Pepperoni' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page.locator('h2')).toContainText('So worth it');
  await expect(page.getByText('Send me those 2 pizzas right now!')).toBeVisible();
  await expect(page.getByText('Veggie')).toBeVisible();
  await expect(page.getByText('Pepperoni')).toBeVisible();
});

test('payment page cancel button', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
        ],
        more: false,
      }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token');
  });

  await page.getByRole('link', { name: 'Order' }).click();
  await page.locator('select').selectOption('4');
  await page.getByRole('button', { name: 'Veggie' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
});

test('payment page redirects to login when not authenticated', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });

  const order = {
    items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }],
    storeId: 4,
    franchiseId: 1
  };

  await page.goto('/payment', { state: { order } });
  await page.waitForURL(/.*\/login$/);
});

test('menu page submit without selection shows validation', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
      ]
    });
  });

  await page.goto('/menu');
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  
  // Checkout button should be disabled without store selection
  const checkoutButton = page.getByRole('button', { name: 'Checkout' });
  await expect(checkoutButton).toBeDisabled();
});

test('menu page adds multiple pizzas', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ]
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
      ]
    });
  });

  await page.goto('/menu');
  
  await expect(page.locator('select')).toBeVisible();
  await expect(page.locator('option[value="4"]')).toBeVisible();
  
  await page.locator('select').selectOption('4');
  await page.getByRole('button', { name: 'Veggie' }).click();
  await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
  
  await page.getByRole('button', { name: 'Pepperoni' }).click();
  await expect(page.getByText('Selected pizzas: 2')).toBeVisible();
});

test('admin dashboard with multiple franchises', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
          {
            id: 1,
            name: 'LotaPizza',
            admins: [{ name: 'Admin', email: 'a@jwt.com' }],
            stores: [
              { id: 4, name: 'Lehi', totalRevenue: 100 },
              { id: 5, name: 'Provo', totalRevenue: 50 }
            ]
          },
          {
            id: 2,
            name: 'PizzaWorld',
            admins: [{ name: 'Admin2', email: 'admin2@jwt.com' }],
            stores: [{ id: 6, name: 'Orem', totalRevenue: 75 }]
          }
        ]
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');
  
  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByText('PizzaWorld')).toBeVisible();
  await expect(page.getByText('Lehi')).toBeVisible();
  await expect(page.getByText('Provo')).toBeVisible();
  await expect(page.getByText('Orem')).toBeVisible();
});

test('close franchise cancel button', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', admins: [{ name: 'Admin', email: 'a@jwt.com' }], stores: [] }
        ],
        more: false,
      }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');
  await page.getByRole('button', { name: 'Close' }).first().click();
  
  await expect(page.locator('h2')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
});

test('close store cancel button', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
    });
  });

  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 1, name: 'LotaPizza', admins: [{ name: 'Admin', email: 'a@jwt.com' }], stores: [{ id: 4, name: 'Lehi', totalRevenue: 100 }] }
        ],
        more: false,
      }
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');
  await page.getByRole('button', { name: 'Close' }).nth(1).click();
  
  await expect(page.locator('h2')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Mama Ricci\'s kitchen')).toBeVisible();
});

test('franchisee dashboard displays franchises', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({
      json: { id: 2, name: 'Franchisee', email: 'f@jwt.com', roles: [{ role: 'franchisee' }] }
    });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
          { 
            id: 1, 
            name: 'LotaPizza', 
            admins: [{ id: 2, name: 'Franchisee', email: 'f@jwt.com' }], 
            stores: [
              { id: 4, name: 'Lehi', totalRevenue: 100 },
              { id: 5, name: 'Provo', totalRevenue: 50 }
            ] 
          }
        ]
      });
    }
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token');
  });
  await page.goto('/franchise-dashboard');
  
  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByText('Lehi')).toBeVisible();
  await expect(page.getByText('Provo')).toBeVisible();
  await expect(page.getByText('100 ₿')).toBeVisible();
});
