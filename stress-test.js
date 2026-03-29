#!/usr/bin/env node
import http from 'http';

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_USERS = 50;
const REQUESTS_PER_USER = 10;

let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;
let totalTime = 0;

function makeRequest(method, path) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(path, BASE_URL);
    
    const req = http.request(url, { method }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        totalTime += duration;
        totalRequests++;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          successRequests++;
        } else {
          failedRequests++;
        }
        
        resolve({ status: res.statusCode, duration });
      });
    });
    
    req.on('error', () => {
      totalRequests++;
      failedRequests++;
      resolve({ status: 0, duration: 0 });
    });
    
    req.end();
  });
}

async function runStressTest() {
  console.log('\n🔥 STRESS TEST: 50 Concurrent Users × 10 Requests\n');
  console.log('Starting test...\n');
  
  const startTime = Date.now();
  const userPromises = [];
  
  // Create 50 concurrent users
  for (let user = 0; user < CONCURRENT_USERS; user++) {
    const userPromise = (async () => {
      for (let req = 0; req < REQUESTS_PER_USER; req++) {
        // Alternate between endpoints
        const endpoints = [
          '/api/health',
          '/api/v1/auth/register',
          '/api/v1/data/preview',
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        await makeRequest('GET', endpoint);
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 10));
      }
    })();
    
    userPromises.push(userPromise);
  }
  
  await Promise.all(userPromises);
  const totalDuration = Date.now() - startTime;
  
  console.log('═══════════════════════════════════════');
  console.log('📊 STRESS TEST RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`Total Requests:        ${totalRequests}`);
  console.log(`Successful (2xx):      ${successRequests} ✅`);
  console.log(`Failed (non-2xx):      ${failedRequests} ❌`);
  console.log(`Success Rate:          ${((successRequests/totalRequests)*100).toFixed(1)}%`);
  console.log(`Average Response Time: ${(totalTime/totalRequests).toFixed(0)}ms`);
  console.log(`Total Duration:        ${totalDuration}ms`);
  console.log(`Throughput:            ${(totalRequests/(totalDuration/1000)).toFixed(0)} req/sec`);
  console.log('═══════════════════════════════════════\n');
}

runStressTest().catch(console.error);
