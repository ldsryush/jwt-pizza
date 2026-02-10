import { test, expect } from 'playwright-test-coverage';

test('home page', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await expect(page.locator('h2')).toContainText("The web's best pizza");
});

test('about page shows content', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.locator('h2')).toContainText('The secret sauce');
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
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Docs' }).click();
  await expect(page.locator('h2')).toContainText('JWT Pizza API');
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
  
  await page.goto('/');
  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await expect(page.getByText('Veggie')).toBeVisible();
  await expect(page.getByText('Pepperoni')).toBeVisible();
});

test('order pizza complete flow', async ({ page }) => {
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
  
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      const orderReq = route.request().postDataJSON();
      await route.fulfill({
        json: {
          order: { ...orderReq, id: 23, date: '2024-01-01T00:00:00.000Z' },
          jwt: 'eyJpYXQ'
        }
      });
    }
  });
  
  await page.route('*/**/api/order/verify/*', async (route) => {
    await route.fulfill({
      json: {
        message: 'valid',
        payload: {
          vendor: { id: 'test', name: 'Test Vendor' },
          diner: { id: 3, name: 'Kai Chen', email: 'd@jwt.com' },
          order: { items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }], franchiseId: 1, storeId: 4, id: 23 }
        }
      }
    });
  });
  
  await page.goto('/');
  await page.getByRole('button', { name: 'Order now' }).click();
  
  // Select store
  await page.locator('select').selectOption('4');
  
  // Add pizzas
  await page.getByRole('button', { name: /Veggie/ }).click();
  await page.getByRole('button', { name: /Pepperoni/ }).click();
  await expect(page.getByText('Selected pizzas: 2')).toBeVisible();
  
  // Checkout
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Login
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Pay
  await expect(page.locator('main')).toContainText('Send me those 2 pizzas right now!');
  await page.getByRole('button', { name: 'Pay now' }).click();
  
  // Verify
  await expect(page.locator('main')).toContainText('0.008');
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
              items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }],
            },
          ],
          page: 1,
        }
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.locator('h2')).toContainText('Your pizza kitchen');
  await expect(page.locator('main')).toContainText('Kai Chen');
  await expect(page.locator('main')).toContainText('d@jwt.com');
});

test('franchise dashboard for franchisee', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 4, 
        name: 'Pizza Franchisee', 
        email: 'f@jwt.com', 
        roles: [{ objectId: 1, role: 'franchisee' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise/1', async (route) => {
    await route.fulfill({
      json: {
        id: 1,
        name: 'My Franchise',
        admins: [{ id: 4, name: 'Pizza Franchisee', email: 'f@jwt.com' }],
        stores: [
          { id: 1, name: 'Store 1', totalRevenue: 1000 },
          { id: 2, name: 'Store 2', totalRevenue: 2000 }
        ]
      }
    });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'PF' }).click();
  await expect(page.locator('h2')).toContainText('My Franchise');
  await expect(page.locator('main')).toContainText('Store 1');
  await expect(page.locator('main')).toContainText('Store 2');
});

test('admin dashboard', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 1, 
        name: 'Admin User', 
        email: 'admin@jwt.com', 
        roles: [{ role: 'admin' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise', async (route) => {
    await route.fulfill({
      json: [
        { 
          id: 1, 
          name: 'Franchise 1', 
          admins: [{ id: 2, name: 'User 1', email: 'u1@jwt.com' }],
          stores: [{ id: 1, name: 'Store 1' }] 
        },
      ]
    });
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'AU' }).click();
  await expect(page.locator('h2')).toContainText('Mama Ricci');
  await expect(page.locator('main')).toContainText('Franchise 1');
});

test('create franchise as admin', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 1, 
        name: 'Admin User', 
        email: 'admin@jwt.com', 
        roles: [{ role: 'admin' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [] });
    } else if (route.request().method() === 'POST') {
      const req = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: 1,
          name: req.name,
          admins: [{ id: req.admins[0].email, name: 'New Admin', email: req.admins[0].email }],
          stores: []
        }
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'AU' }).click();
  await page.getByRole('button', { name: 'Create franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('New Franchise');
  await page.getByPlaceholder('franchisee admin email').fill('newadmin@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  
  await expect(page.locator('main')).toContainText('New Franchise');
});

test('close franchise as admin', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 1, 
        name: 'Admin User', 
        email: 'admin@jwt.com', 
        roles: [{ role: 'admin' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
          { 
            id: 1, 
            name: 'Franchise to Close', 
            admins: [{ id: 2, name: 'User 1', email: 'u1@jwt.com' }],
            stores: [] 
          },
        ]
      });
    }
  });
  
  await page.route('*/**/api/franchise/1', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });
  
  page.on('dialog', dialog => dialog.accept());
  
  await page.goto('/');
  await page.getByRole('link', { name: 'AU' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  
  await expect(page.locator('h2')).toContainText('Mama Ricci');
});

test('create store as franchisee', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 4, 
        name: 'Pizza Franchisee', 
        email: 'f@jwt.com', 
        roles: [{ objectId: 1, role: 'franchisee' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          id: 1,
          name: 'My Franchise',
          admins: [{ id: 4, name: 'Pizza Franchisee', email: 'f@jwt.com' }],
          stores: []
        }
      });
    } else if (route.request().method() === 'POST') {
      const req = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: 10,
          franchiseId: 1,
          name: req.name
        }
      });
    }
  });
  
  await page.goto('/');
  await page.getByRole('link', { name: 'PF' }).click();
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('New Store');
  await page.getByRole('button', { name: 'Create' }).click();
  
  await expect(page.locator('main')).toContainText('New Store');
});

test('close store as franchisee', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ 
      json: { 
        id: 4, 
        name: 'Pizza Franchisee', 
        email: 'f@jwt.com', 
        roles: [{ objectId: 1, role: 'franchisee' }] 
      } 
    });
  });
  
  await page.route('*/**/api/franchise/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          id: 1,
          name: 'My Franchise',
          admins: [{ id: 4, name: 'Pizza Franchisee', email: 'f@jwt.com' }],
          stores: [{ id: 10, name: 'Store to Close', totalRevenue: 0 }]
        }
      });
    }
  });
  
  await page.route('*/**/api/franchise/1/store/10', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'store deleted' } });
    }
  });
  
  page.on('dialog', dialog => dialog.accept());
  
  await page.goto('/');
  await page.getByRole('link', { name: 'PF' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  
  await expect(page.locator('h2')).toContainText('My Franchise');
});
