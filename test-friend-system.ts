// Test script for Friend System APIs
// Run this in browser console or as a Node.js script with fetch polyfill

const API_BASE = 'http://localhost:3000';

// Helper function to make API calls
async function api(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important: sends cookies
  });

  const text = await response.text();
  try {
    return { status: response.status, data: JSON.parse(text) };
  } catch {
    return { status: response.status, data: text };
  }
}

// 1. Register a new user
export async function testRegister(username: string, email: string, password: string, name?: string) {
  console.log('📝 Registering user:', username);
  const result = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, name }),
  });
  console.log('Result:', result);
  return result;
}

// 2. Login
export async function testLogin(username: string, password: string) {
  console.log('🔐 Logging in:', username);
  const result = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  console.log('Result:', result);
  return result;
}

// 3. Get current session
export async function testSession() {
  console.log('👤 Getting current session');
  const result = await api('/api/auth/session');
  console.log('Result:', result);
  return result;
}

// 4. Send friend request
export async function testSendFriendRequest(receiverUsername: string) {
  console.log('📤 Sending friend request to:', receiverUsername);
  const result = await api('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ receiverUsername }),
  });
  console.log('Result:', result);
  return result;
}

// 5. Get friend requests
export async function testGetFriendRequests(type?: 'sent' | 'received') {
  const query = type ? `?type=${type}` : '';
  console.log('📥 Getting friend requests', type ? `(${type})` : '(all)');
  const result = await api(`/api/friends/requests${query}`);
  console.log('Result:', result);
  return result;
}

// 6. Accept friend request
export async function testAcceptFriendRequest(requestId: string) {
  console.log('✅ Accepting friend request:', requestId);
  const result = await api(`/api/friends/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'accept' }),
  });
  console.log('Result:', result);
  return result;
}

// 7. Reject friend request
export async function testRejectFriendRequest(requestId: string) {
  console.log('❌ Rejecting friend request:', requestId);
  const result = await api(`/api/friends/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reject' }),
  });
  console.log('Result:', result);
  return result;
}

// 8. Cancel friend request
export async function testCancelFriendRequest(requestId: string) {
  console.log('🚫 Cancelling friend request:', requestId);
  const result = await api(`/api/friends/requests/${requestId}`, {
    method: 'DELETE',
  });
  console.log('Result:', result);
  return result;
}

// 9. Get friends list
export async function testGetFriends() {
  console.log('👥 Getting friends list');
  const result = await api('/api/friends');
  console.log('Result:', result);
  return result;
}

// 10. Remove friend
export async function testRemoveFriend(friendId: string) {
  console.log('💔 Removing friend:', friendId);
  const result = await api(`/api/friends/${friendId}`, {
    method: 'DELETE',
  });
  console.log('Result:', result);
  return result;
}

// 11. Logout
export async function testLogout() {
  console.log('👋 Logging out');
  const result = await api('/api/auth/logout', {
    method: 'POST',
  });
  console.log('Result:', result);
  return result;
}

// Full test flow
export async function runFullTest() {
  console.log('🚀 Starting full test flow...\n');

  // Create two users
  console.log('=== Step 1: Create User A ===');
  await testRegister('alice', 'alice@example.com', 'password123', 'Alice Smith');
  
  console.log('\n=== Step 2: Logout User A ===');
  await testLogout();

  console.log('\n=== Step 3: Create User B ===');
  await testRegister('bob', 'bob@example.com', 'password123', 'Bob Jones');
  
  console.log('\n=== Step 4: Get User B session ===');
  await testSession();

  console.log('\n=== Step 5: User B sends friend request to Alice ===');
  const requestResult = await testSendFriendRequest('alice');
  const requestId = requestResult.data?.id;

  console.log('\n=== Step 6: User B checks sent requests ===');
  await testGetFriendRequests('sent');

  console.log('\n=== Step 7: Logout User B ===');
  await testLogout();

  console.log('\n=== Step 8: Login as User A ===');
  await testLogin('alice', 'password123');

  console.log('\n=== Step 9: User A checks received requests ===');
  await testGetFriendRequests('received');

  if (requestId) {
    console.log('\n=== Step 10: User A accepts friend request ===');
    await testAcceptFriendRequest(requestId);

    console.log('\n=== Step 11: User A checks friends list ===');
    await testGetFriends();
  }

  console.log('\n✅ Full test completed!');
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  (window as any).friendSystemTest = {
    testRegister,
    testLogin,
    testSession,
    testSendFriendRequest,
    testGetFriendRequests,
    testAcceptFriendRequest,
    testRejectFriendRequest,
    testCancelFriendRequest,
    testGetFriends,
    testRemoveFriend,
    testLogout,
    runFullTest,
  };
  console.log('✅ Friend System Test functions loaded!');
  console.log('Available functions:', Object.keys((window as any).friendSystemTest));
  console.log('Run runFullTest() to execute full test flow');
}
