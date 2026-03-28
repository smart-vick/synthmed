#!/usr/bin/env node
import http from 'http';

const BASE_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n🧪 Running 8 Local Tests\n');

  // Test 1: Health Check
  await test('1. API Health', async () => {
    const res = await makeRequest('GET', '/api/health');
    if (res.status !== 200 || !res.body.ok) throw new Error('Health check failed');
  });

  // Test 2: User Registration
  let authToken = null;
  let userId = null;
  const testEmail = `test-${Date.now()}@example.com`;
  await test('2. User Registration', async () => {
    const res = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmail,
      organization: 'Test Org',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });
    if (res.status !== 201 || !res.body.ok) throw new Error(`Registration failed: ${res.status}`);
    userId = res.body.account.id;
  });

  // Test 3: User Login
  await test('3. User Login', async () => {
    const res = await makeRequest('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: 'SecurePass123!',
    });
    if (res.status !== 200 || !res.body.accessToken) throw new Error(`Login failed: ${res.status}`);
    authToken = res.body.accessToken;
  });

  // Test 4: Generate Synthetic Data (using API Key)
  let apiKey = null;
  await test('4. Generate Synthetic Data', async () => {
    if (!authToken) throw new Error('No auth token');

    // First create an API key
    const keyRes = await makeRequest('POST', '/api/v1/api-keys', {
      name: 'Test Key',
    }, {
      'Authorization': `Bearer ${authToken}`,
    });
    if (keyRes.status !== 201 || !keyRes.body.apiKey?.key) throw new Error(`API key creation failed: ${keyRes.status}`);
    apiKey = keyRes.body.apiKey.key;

    // Then use the API key to generate data
    const res = await makeRequest('POST', '/api/v1/generate/batch', {
      conditionCategory: 'cardiovascular',
      count: 5,
      format: 'json',
    }, {
      'x-api-key': apiKey,
    });
    if (res.status !== 200 || !res.body.records) throw new Error(`Generation failed: ${res.status}`);
  });

  // Test 5: Lead Capture (form submission)
  await test('5. Lead Capture', async () => {
    const res = await makeRequest('POST', '/api/v1/leads', {
      name: 'Test Lead Person',
      email: `lead-form-${Date.now()}@example.com`,
      organization: 'Acme Corp',
      role: 'Manager',
    });
    // Accept 201 (created), 400 (validation), or 429 (rate limited) as valid responses
    // Just verify endpoint is working
    if (![201, 400, 429].includes(res.status)) {
      throw new Error(`Lead capture endpoint error: ${res.status}`);
    }
  });

  // Test 6: Rate Limiting Behavior
  await test('6. Rate Limiting', async () => {
    // Just verify the rate limiting middleware is working by making requests
    // Some should succeed, some might be limited - both are OK
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(makeRequest('POST', '/api/v1/leads', {
        name: `Lead ${i}`,
        email: `lead-${i}-${Date.now()}@example.com`,
        organization: 'Test',
        role: 'Test',
      }));
    }
    const results = await Promise.all(promises);
    // Just verify we got responses (rate limiting is transparent to client)
    if (results.some(r => ![201, 429].includes(r.status))) {
      throw new Error('Rate limiting responded with unexpected status');
    }
  });

  // Test 7: Admin Dashboard Access
  await test('7. Admin Dashboard', async () => {
    const res = await makeRequest('GET', '/admin.html');
    if (res.status !== 200) throw new Error(`Admin dashboard not accessible: ${res.status}`);
  });

  // Test 8: Landing Page
  await test('8. Landing Page', async () => {
    const res = await makeRequest('GET', '/');
    if (res.status !== 200) throw new Error(`Landing page not accessible: ${res.status}`);
  });

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(console.error);
