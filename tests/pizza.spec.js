import { test, expect } from 'playwright-test-coverage';

const testUser = { id: '3', name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] };
const testAdmin = { id: '1', name: 'Admin User', email: 'a@jwt.com', roles: [{ role: 'admin' }] };
const testFranchisee = { id: '2', name: 'Franchise Owner', email: 'f@jwt.com', roles: [{ role: 'franchisee', objectId: '1' }] };

async function setupMocks(page, options = {}) {
  const { user = null, loginUser = testUser } = options;

  // Mock login
  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      if (loginReq.email === loginUser.email && loginReq.password === 'a') {
        await route.fulfill({ json: { user: loginUser, token: 'test-token' } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'Invalid credentials' } });
      }
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  // Mock register
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      const registerReq = route.request().postDataJSON();
      const newUser = { id: '4', name: registerReq.name, email: registerReq.email, roles: [{ role: 'diner' }] };
      await route.fulfill({ json: { user: newUser, token: 'test-token' } });
    }
  });

  // Mock get current user
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: user });
  });

  // Mock menu
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      { id: 3, title: 'Margarita', image: 'pizza3.png', price: 0.0014, description: 'Essential classic' },
    ];
    await route.fulfill({ json: menuRes });
  });

  // Mock franchises
  await page.route('*/**/api/franchise', async (route) => {
    const franchiseRes = [
      { id: 1, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }, { id: 5, name: 'Springville' }] },
      { id: 2, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
    ];
    await route.fulfill({ json: franchiseRes });
  });

  // Mock order creation
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      const orderReq = route.request().postDataJSON();
      const orderRes = {
        order: { ...orderReq, id: 23, date: '2024-01-01T00:00:00.000Z' },
        jwt: 'eyJpYXQ',
      };
      await route.fulfill({ json: orderRes });
    } else if (route.request().method() === 'GET') {
      const ordersRes = {
        dinerId: user?.id || '3',
        orders: [
          {
            id: '1',
            franchiseId: '1',
            storeId: '4',
            date: '2024-01-01T00:00:00.000Z',
            items: [{ menuId: '1', description: 'Veggie', price: 0.0038 }],
          },
        ],
        page: 1,
      };
      await route.fulfill({ json: ordersRes });
    }
  });

  // Mock JWT verification
  await page.route('*/**/api/order/verify/*', async (route) => {
    await route.fulfill({ 
      json: { 
        message: 'valid',
        payload: { vendor: { id: 'test', name: 'Test Vendor' }, diner: { id: '3', name: 'Kai Chen', email: 'd@jwt.com' }, order: { items: [], franchiseId: '1', storeId: '4', id: '23' } }
      } 
    });
  });

  // Mock franchise operations for admin/franchisee
  await page.route('*/**/api/franchise/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST' && url.includes('/franchise')) {
      // Create franchise
      const franchiseReq = route.request().postDataJSON();
      await route.fulfill({ json: { id: '3', name: franchiseReq.name, admins: [{ email: franchiseReq.admins[0].email }], stores: [] } });
    } else if (method === 'DELETE') {
      // Delete franchise
      await route.fulfill({ json: { message: 'franchise deleted' } });
    } else if (method === 'POST' && url.includes('/store')) {
      // Create store
      const storeReq = route.request().postDataJSON();
      await route.fulfill({ json: { id: '10', name: storeReq.name, franchiseId: '1' } });
    } else if (method === 'DELETE' && url.includes('/store')) {
      // Delete store
      await route.fulfill({ json: { message: 'store deleted' } });
    } else if (method === 'GET') {
      // Get franchise details
      await route.fulfill({ 
        json: [{ 
          id: '1', 
          name: 'LotaPizza', 
          admins: [{ id: '2', name: 'Franchise Owner', email: 'f@jwt.com' }],
          stores: [
            { id: '4', name: 'Lehi', totalRevenue: 100 }, 
            { id: '5', name: 'Springville', totalRevenue: 200 }
          ] 
        }] 
      });
    }
  });

  // Mock docs endpoint
  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({ 
      json: { 
        version: '1.0.0',
        endpoints: [
          { method: 'GET', path: '/api/order/menu', requiresAuth: false, description: 'Get menu', example: 'curl localhost:3000/api/order/menu', response: [] }
        ] 
      } 
    });
  });
}

test('home page', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The web\'s best pizza', exact: false })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('If you want to support');
});

test('about page', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('main')).toContainText('At JWT Pizza');
  await expect(page.getByRole('main')).toContainText('authentic Italian pizza');
});

test('history page', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('main')).toContainText('Mama Rucci');
  await expect(page.getByRole('main')).toContainText('secret family recipe');
});

test('register new user', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('test@test.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();
  
  await expect(page.getByRole('link', { name: 'TU' })).toBeVisible();
});

test('login and logout', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  
  // Login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  
  // Logout
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('failed login', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('wrong@test.com');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Should still be on login page or show error
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('order pizza with login', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  
  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.getByRole('heading')).toContainText('Awesome is a click away');
  
  // Select franchise and store
  await page.getByRole('combobox').selectOption('4');
  
  // Add pizzas
  await page.locator('.pizza-item').first().click();
  await page.locator('.pizza-item').nth(1).click();
  
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Login
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Payment
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await page.getByRole('button', { name: 'Pay now' }).click();
  
  // Verify order
  await expect(page.locator('body')).toContainText('0.008');
});

test('view diner dashboard', async ({ page }) => {
  await setupMocks(page, { user: testUser });
  await page.goto('/');
  
  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
});

test('view franchise dashboard as franchisee', async ({ page }) => {
  await setupMocks(page, { user: testFranchisee, loginUser: testFranchisee });
  await page.goto('/');
  
  // Navigate to franchise dashboard
  await page.getByRole('link', { name: 'FO' }).click();
  await expect(page.getByRole('heading')).toContainText('LotaPizza');
  await expect(page.getByRole('main')).toContainText('Lehi');
  await expect(page.getByRole('main')).toContainText('Springville');
});

test('view admin dashboard', async ({ page }) => {
  await setupMocks(page, { user: testAdmin, loginUser: testAdmin });
  await page.goto('/');
  
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading')).toContainText('Mama Ricci\'s kitchen');
  await expect(page.getByRole('main')).toContainText('Keep the dough rolling');
});

test('docs page', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/');
  
  await page.getByRole('link', { name: 'Docs' }).click();
  await expect(page.getByRole('heading')).toContainText('JWT Pizza API');
});

test('franchisee can create store', async ({ page }) => {
  await setupMocks(page, { user: testFranchisee, loginUser: testFranchisee });
  await page.goto('/franchise/1');
  
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('New Store');
  await page.getByRole('button', { name: 'Create' }).click();
  
  await expect(page.getByRole('main')).toContainText('New Store');
});

test('franchisee can close store', async ({ page }) => {
  await setupMocks(page, { user: testFranchisee, loginUser: testFranchisee });
  await page.goto('/franchise/1');
  
  // Find and click close button for a store
  const closeButton = page.getByRole('button', { name: 'Close' }).first();
  await closeButton.click();
  await page.getByRole('button', { name: 'Close' }).click(); // Confirm
  
  await expect(page.locator('body')).toContainText('LotaPizza');
});

test('admin can create franchise', async ({ page }) => {
  await setupMocks(page, { user: testAdmin, loginUser: testAdmin });
  await page.goto('/admin');
  
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('New Franchise');
  await page.getByPlaceholder('franchisee admin email').fill('new@franchise.com');
  await page.getByRole('button', { name: 'Create' }).click();
  
  await expect(page.locator('body')).toContainText('Mama Ricci');
});

test('admin can close franchise', async ({ page }) => {
  await setupMocks(page, { user: testAdmin, loginUser: testAdmin });
  await page.goto('/admin');
  
  const closeButton = page.getByRole('button', { name: 'Close' }).first();
  await closeButton.click();
  await page.getByRole('button', { name: 'Close' }).click(); // Confirm
  
  await expect(page.locator('body')).toContainText('Mama Ricci');
});

test('404 page', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/nonexistent-page');
  
  await expect(page.getByRole('heading')).toContainText('Oops');
  await expect(page.locator('main')).toContainText('It looks like we have dropped a pizza on the floor');
});
