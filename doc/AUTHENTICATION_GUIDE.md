# Custom Authentication & Friend System Guide

This guide explains the custom authentication system and friend management features that have been implemented to replace Clerk.

## Overview

The application now uses **JWT-based authentication** with username/password credentials stored in Cassandra. Users can also send and manage friend requests.

---

## Database Schema

### User Tables

#### `users_by_id`
- **Purpose**: Main user storage
- **Primary Key**: `id` (UUID)
- **Columns**: `id`, `username`, `email`, `password_hash`, `name`, `image_url`, `created_at`, `updated_at`

#### `users_by_username`
- **Purpose**: Look up user by username (for login)
- **Primary Key**: `username` (text)
- **Columns**: Same as `users_by_id`

#### `users_by_email`
- **Purpose**: Look up user by email (for duplicate check, password reset)
- **Primary Key**: `email` (text)
- **Columns**: Same as `users_by_id`

### Friend Request Tables

#### `friend_requests_by_id`
- **Purpose**: Main friend request storage
- **Primary Key**: `id` (UUID)
- **Columns**: `id`, `sender_id`, `receiver_id`, `status`, `created_at`, `updated_at`
- **Status Values**: `PENDING`, `ACCEPTED`, `REJECTED`

#### `friend_requests_by_sender`
- **Purpose**: Get all outgoing friend requests for a user
- **Primary Key**: `(sender_id), created_at, id`
- **Includes**: Denormalized receiver info

#### `friend_requests_by_receiver`
- **Purpose**: Get all incoming friend requests for a user
- **Primary Key**: `(receiver_id), created_at, id`
- **Includes**: Denormalized sender info

#### `friend_requests_by_users`
- **Purpose**: Quick lookup to check if request exists between two users
- **Primary Key**: `(user_one_id, user_two_id)`

### Friends Table

#### `friends_by_user`
- **Purpose**: Store accepted friendships
- **Primary Key**: `(user_id), became_friends_at, friend_id`
- **Includes**: Denormalized friend info (username, name, image_url, email)

---

## API Endpoints

### Authentication

#### **POST /api/auth/register**
Register a new user account.

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "createdAt": "2025-11-21T..."
}
```

**Error Codes**:
- `400`: Missing required fields
- `409`: Username or email already exists

---

#### **POST /api/auth/login**
Log in with username and password.

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "imageUrl": null
}
```

Sets an HTTP-only cookie named `auth-token` containing a JWT.

**Error Codes**:
- `400`: Missing credentials
- `401`: Invalid credentials

---

#### **POST /api/auth/logout**
Log out the current user.

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

---

#### **GET /api/auth/session**
Get the current authenticated user's profile.

**Response**:
```json
{
  "id": "uuid",
  "userId": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "imageUrl": null,
  "createdAt": "2025-11-21T...",
  "updatedAt": "2025-11-21T..."
}
```

**Error Codes**:
- `401`: Unauthorized (no valid session)

---

### Friend Requests

#### **POST /api/friends/requests**
Send a friend request to another user.

**Request Body**:
```json
{
  "receiverUsername": "janedoe"
}
```

**Response**:
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "receiverUsername": "janedoe",
  "receiverName": "Jane Doe",
  "status": "PENDING",
  "createdAt": "2025-11-21T..."
}
```

**Error Codes**:
- `400`: Cannot send to yourself
- `404`: User not found
- `409`: Request already exists or already friends

---

#### **GET /api/friends/requests?type={type}**
Get friend requests for the current user.

**Query Parameters**:
- `type`: `sent` | `received` | omit for both

**Response (when type is omitted)**:
```json
{
  "sent": [...],
  "received": [...]
}
```

---

#### **PATCH /api/friends/requests/[requestId]**
Accept or reject a friend request.

**Request Body**:
```json
{
  "action": "accept"  // or "reject"
}
```

**Response**:
```json
{
  "id": "uuid",
  "status": "ACCEPTED",
  "updatedAt": "2025-11-21T..."
}
```

**Error Codes**:
- `400`: Invalid action or already processed
- `403`: Not authorized (not the receiver)
- `404`: Request not found

---

#### **DELETE /api/friends/requests/[requestId]**
Cancel a friend request (only sender can cancel).

**Response**:
```json
{
  "message": "Friend request cancelled"
}
```

**Error Codes**:
- `403`: Not authorized (not the sender)
- `404`: Request not found

---

### Friends

#### **GET /api/friends**
Get all friends for the current user.

**Response**:
```json
[
  {
    "userId": "uuid",
    "friendId": "uuid",
    "friendUsername": "janedoe",
    "friendName": "Jane Doe",
    "friendImageUrl": null,
    "friendEmail": "jane@example.com",
    "becameFriendsAt": "2025-11-21T..."
  }
]
```

---

#### **DELETE /api/friends/[friendId]**
Remove a friend.

**Response**:
```json
{
  "message": "Friend removed"
}
```

**Error Codes**:
- `404`: Friendship not found

---

## Frontend Components

### Sign-In Page
**Location**: `app/(auth)/(routes)/sign-in/page.tsx`

Features:
- Username and password input
- Error handling
- Redirect to home after successful login
- Link to sign-up page

### Sign-Up Page
**Location**: `app/(auth)/(routes)/sign-up/page.tsx`

Features:
- Username, email, password, confirm password, and optional display name
- Client-side validation
- Auto-login after successful registration
- Error handling
- Link to sign-in page

---

## Authentication Flow

### Registration Flow
1. User submits registration form
2. Backend validates input
3. Check if username/email already exists
4. Hash password with bcrypt (10 rounds)
5. Create user records in all user tables
6. Create profile records for backward compatibility
7. Auto-login: Create JWT and set cookie
8. Redirect to home

### Login Flow
1. User submits login form
2. Backend looks up user by username
3. Verify password with bcrypt
4. Create JWT token with user info
5. Set HTTP-only cookie with JWT
6. Return user data
7. Redirect to home

### Session Validation
1. Extract JWT from `auth-token` cookie
2. Verify JWT signature
3. Decode user ID from token
4. Fetch profile from database
5. Return profile or null if invalid

---

## Security Features

### Password Security
- Passwords are hashed using **bcryptjs** with 10 rounds
- Plain text passwords are never stored
- Password minimum length: 6 characters

### JWT Security
- Tokens are signed with a secret key (set in `JWT_SECRET` env var)
- Tokens expire after 7 days
- Stored in HTTP-only cookies (not accessible via JavaScript)
- `sameSite: 'lax'` to prevent CSRF attacks
- `secure: true` in production (HTTPS only)

### Middleware Protection
- All routes are protected by default
- Public routes: `/sign-in`, `/sign-up`, `/api/auth/*`, `/api/uploadthing`
- Unauthenticated users redirected to `/sign-in`
- Authenticated users accessing auth pages redirected to home

---

## Environment Variables

Add these to your `.env` file:

```env
# JWT Secret (IMPORTANT: Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Cassandra Database
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_LOCAL_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=discord_app
```

---

## Migration from Clerk

### Steps to Complete Migration

1. **Remove Clerk dependency** (optional):
   ```bash
   npm uninstall @clerk/nextjs
   ```

2. **Update all components** that import Clerk:
   - Remove `import { auth } from "@clerk/nextjs"`
   - Remove `import { RedirectToSignIn } from "@clerk/nextjs"`
   - Use `currentProfile()` instead

3. **Apply database schema**:
   ```bash
   # Connect to Cassandra and run schema.cql
   cqlsh -f schema.cql
   ```

4. **Set environment variables**:
   - Add `JWT_SECRET` to `.env`
   - Remove Clerk-related env vars

5. **Test authentication flow**:
   - Register a new account
   - Login
   - Logout
   - Access protected routes

---

## Friend System Usage

### Send Friend Request
```typescript
const response = await fetch('/api/friends/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ receiverUsername: 'targetuser' })
});
```

### Accept Friend Request
```typescript
const response = await fetch(`/api/friends/requests/${requestId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'accept' })
});
```

### Get Friends List
```typescript
const response = await fetch('/api/friends');
const friends = await response.json();
```

### Remove Friend
```typescript
const response = await fetch(`/api/friends/${friendId}`, {
  method: 'DELETE'
});
```

---

## TypeScript Types

Located in `types/friends.ts`:

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

interface Friend {
  userId: string;
  friendId: string;
  friendUsername: string;
  friendName: string;
  friendImageUrl: string | null;
  friendEmail: string;
  becameFriendsAt: Date;
}
```

---

## Next Steps

To fully integrate the friend system into your UI, you'll need to:

1. **Create friend list component** to display all friends
2. **Create friend request component** to show pending requests
3. **Add "Add Friend" button** to user profiles
4. **Add notifications** for new friend requests
5. **Implement direct messaging** between friends (optional)

---

## Troubleshooting

### "JWT_SECRET is not defined"
Make sure you've added `JWT_SECRET` to your `.env` file.

### "Cannot find module 'bcryptjs'"
Run `npm install bcryptjs @types/bcryptjs jsonwebtoken @types/jsonwebtoken`

### "Unauthorized" errors
Check that:
1. You're logged in
2. The `auth-token` cookie is being sent
3. The JWT secret matches between login and validation

### Friend request errors
- Make sure both users exist in the database
- Check that you're not sending a request to yourself
- Verify the request doesn't already exist

---

## Support

For issues or questions, refer to:
- Cassandra documentation: https://cassandra.apache.org/doc/
- bcryptjs documentation: https://github.com/dcodeIO/bcrypt.js
- JWT documentation: https://jwt.io/
