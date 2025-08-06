#!/usr/bin/env node

/**
 * Test script for Keycloak JWT authentication
 * Run with: node test-jwt.js
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM || 'peerit';
const CLIENT_ID = 'peerit-frontend'; // Public client for testing

// Test users from your realm config
const TEST_USERS = [
  { username: 'admin', password: 'Admin123', expectedRoles: ['admin'] },
  { username: 'teacher1', password: 'Teacher123', expectedRoles: ['teacher'] },
  { username: 'student1', password: 'Student123', expectedRoles: ['student'] }
];

async function getToken(username, password) {
  try {
    console.log(`\n🔐 Getting token for ${username}...`);
    
    const response = await axios.post(
      `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username: username,
        password: password,
        scope: 'openid email profile'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Token obtained successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get token:', error.response?.data || error.message);
    return null;
  }
}

function decodeAndAnalyzeToken(tokenResponse) {
  if (!tokenResponse) return;
  
  const { access_token } = tokenResponse;
  const decoded = jwt.decode(access_token, { complete: true });
  
  console.log('\n📋 Token Analysis:');
  console.log('================');
  
  // Header
  console.log('\n🔑 Header:');
  console.log('  Algorithm:', decoded.header.alg);
  console.log('  Type:', decoded.header.typ);
  console.log('  Key ID:', decoded.header.kid);
  
  // Payload
  const payload = decoded.payload;
  console.log('\n📦 Payload:');
  console.log('  Subject (sub):', payload.sub);
  console.log('  Username:', payload.preferred_username);
  console.log('  Email:', payload.email);
  console.log('  Name:', payload.name);
  console.log('  Issuer:', payload.iss);
  console.log('  Audience:', payload.aud || 'NOT PRESENT (Keycloak v26)');
  console.log('  Client ID (azp):', payload.azp);
  
  // Token validity
  const now = Math.floor(Date.now() / 1000);
  console.log('\n⏰ Token Validity:');
  console.log('  Issued At:', new Date(payload.iat * 1000).toISOString());
  console.log('  Expires At:', new Date(payload.exp * 1000).toISOString());
  console.log('  Valid for:', Math.floor((payload.exp - now) / 60), 'minutes');
  
  // Roles
  console.log('\n👥 Roles:');
  if (payload.realm_access?.roles) {
    console.log('  Realm Roles:', payload.realm_access.roles);
  }
  
  if (payload.resource_access) {
    console.log('  Resource Access:');
    Object.entries(payload.resource_access).forEach(([client, access]) => {
      if (access.roles && access.roles.length > 0) {
        console.log(`    ${client}:`, access.roles);
      }
    });
  }
  
  return decoded;
}

async function testUserServiceEndpoint(token, endpoint = '/health') {
  try {
    console.log(`\n🔧 Testing User Service endpoint: ${endpoint}`);
    
    const response = await axios.get(
      `http://localhost:3020${endpoint}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Request successful:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Request failed:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

async function testProtectedEndpoint(token, username) {
  // Map username to expected user ID pattern
  const endpoints = [
    '/api/users/profile',  // Current user profile
    '/api/users/search?query=test&limit=5'  // Search (admin/teacher only)
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing protected endpoint: ${endpoint}`);
    try {
      const response = await axios.get(
        `http://localhost:3020${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Success:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 403) {
        console.log('⚠️  Forbidden (insufficient permissions):', message);
      } else if (status === 401) {
        console.log('🔒 Unauthorized:', message);
      } else if (status === 404) {
        console.log('📭 Not Found (may need to sync user from Keycloak first)');
      } else {
        console.log('❌ Error:', status, message);
      }
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Keycloak JWT Authentication Tests');
  console.log('===========================================');
  console.log('Keycloak URL:', KEYCLOAK_URL);
  console.log('Realm:', REALM);
  console.log('Client ID:', CLIENT_ID);
  
  // First, check if Keycloak is accessible
  try {
    console.log('\n🏥 Checking Keycloak health...');
    const realmResponse = await axios.get(`${KEYCLOAK_URL}/realms/${REALM}`);
    console.log('✅ Keycloak is accessible');
    console.log('  Realm:', realmResponse.data.realm);
    console.log('  Display Name:', realmResponse.data.displayName);
  } catch (error) {
    console.error('❌ Cannot reach Keycloak:', error.message);
    console.log('\n💡 Make sure Keycloak is running:');
    console.log('   docker compose -f compose.test.yml up -d');
    return;
  }
  
  // Test each user
  for (const user of TEST_USERS) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing User: ${user.username}`);
    console.log('='.repeat(60));
    
    const tokenResponse = await getToken(user.username, user.password);
    
    if (tokenResponse) {
      const decoded = decodeAndAnalyzeToken(tokenResponse);
      
      // Test the health endpoint (no auth required)
      await testUserServiceEndpoint(tokenResponse.access_token, '/health');
      
      // Test protected endpoints
      await testProtectedEndpoint(tokenResponse.access_token, user.username);
      
      // Verify expected roles
      const actualRoles = decoded.payload.realm_access?.roles || [];
      const hasExpectedRoles = user.expectedRoles.every(role => 
        actualRoles.includes(role)
      );
      
      if (hasExpectedRoles) {
        console.log(`\n✅ User has expected roles: ${user.expectedRoles.join(', ')}`);
      } else {
        console.log(`\n⚠️  Missing expected roles. Expected: ${user.expectedRoles.join(', ')}, Got: ${actualRoles.join(', ')}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Tests Complete!');
  console.log('='.repeat(60));
  
  console.log('\n💡 Troubleshooting Tips:');
  console.log('1. If tokens are obtained but validation fails:');
  console.log('   - Check that KEYCLOAK_URL matches in both services');
  console.log('   - Verify the realm name is correct');
  console.log('   - Look for "aud" field issues (Keycloak v26 doesn\'t include it)');
  console.log('\n2. If user profiles return 404:');
  console.log('   - Users need to be synced from Keycloak to the database');
  console.log('   - Run: npx prisma migrate dev');
  console.log('   - Run: npx prisma db seed');
  console.log('\n3. For debugging, set NODE_ENV=development to see more logs');
}

// Run the tests
runTests().catch(console.error);