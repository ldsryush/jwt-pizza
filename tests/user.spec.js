import { test, expect } from 'playwright-test-coverage';

test('updateUser', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  let userName = 'pizza diner';
  
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: null });
  });
  
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      // Register
      await route.fulfill({
        json: {
          user: { id: 4, name: userName, email: email, roles: [{ role: 'diner' }] },
          token: 'test-token',
        },
      });
    } else if (route.request().method() === 'PUT') {
      // Login
      await route.fulfill({
        json: {
          user: { id: 4, name: userName, email: email, roles: [{ role: 'diner' }] },
          token: 'test-token',
        },
      });
    } else if (route.request().method() === 'DELETE') {
      // Logout
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });
  
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          dinerId: 4,
          orders: [],
          page: 1,
        },
      });
    }
  });
  
  await page.route('*/**/api/user/4', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      userName = body.name;
      await route.fulfill({
        json: {
          user: { id: 4, name: userName, email: body.email, roles: [{ role: 'diner' }] },
          token: 'test-token',
        },
      });
    }
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('pizza diner');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  // Test dialog display and update
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // Test persistence by logging out and back in
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('listUsers as admin', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] } });
  });

  await page.route('*/**/api/user?page=0&limit=10&name=*', async (route) => {
    await route.fulfill({
      json: {
        users: [
          { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
          { id: 2, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
          { id: 3, name: 'Pizza User', email: 'p@jwt.com', roles: [{ role: 'diner' }] },
        ],
        more: false,
      },
    });
  });

  await page.route('*/**/api/franchise?page=0&limit=3&name=*', async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByText('Kai Chen')).toBeVisible();
  await expect(page.getByText('d@jwt.com')).toBeVisible();
  await expect(page.getByText('Pizza User')).toBeVisible();
});

test('deleteUser as admin', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] } });
  });

  let userDeleted = false;
  await page.route('*/**/api/user?page=0&limit=10&name=*', async (route) => {
    const users = userDeleted
      ? [
          { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
          { id: 3, name: 'Pizza User', email: 'p@jwt.com', roles: [{ role: 'diner' }] },
        ]
      : [
          { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
          { id: 2, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
          { id: 3, name: 'Pizza User', email: 'p@jwt.com', roles: [{ role: 'diner' }] },
        ];
    await route.fulfill({ json: { users, more: false } });
  });

  await page.route('*/**/api/user/2', async (route) => {
    if (route.request().method() === 'DELETE') {
      userDeleted = true;
      await route.fulfill({ json: { message: 'user deleted' } });
    }
  });

  await page.route('*/**/api/franchise?page=0&limit=3&name=*', async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');

  await expect(page.getByText('Kai Chen')).toBeVisible();
  
  // Find the row containing "Kai Chen" and click its delete button
  const kaiRow = page.locator('tr', { has: page.getByText('d@jwt.com') });
  await kaiRow.getByRole('button', { name: /delete/i }).click();
  
  // Wait for the deletion and list refresh
  await page.waitForTimeout(500);
  
  // User should be removed from list
  await expect(page.getByText('Kai Chen')).not.toBeVisible();
  await expect(page.getByText('Pizza User')).toBeVisible();
});

test('filterUsers by name', async ({ page }) => {
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] } });
  });

  await page.route('*/**/api/user?page=0&limit=10&name=*Kai*', async (route) => {
    await route.fulfill({
      json: {
        users: [{ id: 2, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }],
        more: false,
      },
    });
  });

  await page.route('*/**/api/user?page=0&limit=10&name=*', async (route) => {
    await route.fulfill({
      json: {
        users: [
          { id: 1, name: 'Admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
          { id: 2, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
        ],
        more: false,
      },
    });
  });

  await page.route('*/**/api/franchise?page=0&limit=3&name=*', async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token');
  });
  await page.goto('/admin-dashboard');

  await page.getByPlaceholder('Filter users').fill('Kai');
  await page.getByRole('button', { name: 'Filter' }).click();

  await expect(page.getByText('Kai Chen')).toBeVisible();
});

