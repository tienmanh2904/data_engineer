# 🚀 Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Cassandra running (Docker recommended)
- Git installed

---

## Step 1: Install Dependencies

```bash
npm install
```

**Already installed packages:**
- ✅ bcryptjs & @types/bcryptjs
- ✅ jsonwebtoken & @types/jsonwebtoken
- ✅ cassandra-driver
- ✅ All existing dependencies

---

## Step 2: Start Cassandra Database

### Option A: Docker (Recommended)
```bash
# Start Cassandra
docker run --name cassandra -p 9042:9042 -d cassandra:latest

# Wait 30 seconds for startup
# Check status
docker logs cassandra
```

### Option B: Local Installation
Install Cassandra on your machine and ensure it's running on port 9042.

---

## Step 3: Apply Database Schema

```bash
# Copy schema to container
docker cp schema.cql cassandra:/schema.cql

# Execute schema
docker exec -it cassandra cqlsh -f /schema.cql
```

**Verify schema:**
```bash
docker exec -it cassandra cqlsh

# In cqlsh:
USE discord_app;
DESCRIBE TABLES;
# Should see: users_by_id, friend_requests_by_id, friends_by_user, etc.
```

---

## Step 4: Configure Environment Variables

Create/update `.env` file:

```env
# Cassandra
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_LOCAL_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=discord_app

# JWT (CHANGE THIS!)
JWT_SECRET=generate-a-random-32-char-string-here

# Optional: Third-party services
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Generate strong JWT secret:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or online: https://randomkeygen.com/
```

---

## Step 5: Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 6: Test the System

### Create Your First Account

1. Navigate to **http://localhost:3000/sign-up**
2. Fill in the form:
   - Username: `alice`
   - Email: `alice@example.com`
   - Password: `password123`
   - Name: `Alice Smith`
3. Click **Sign Up**
4. You'll be automatically logged in and redirected

### Test Friend Requests

#### Create a Second User

1. **Logout**: Open browser console and run:
   ```javascript
   await fetch('/api/auth/logout', { method: 'POST' });
   window.location.href = '/sign-up';
   ```

2. Create second account:
   - Username: `bob`
   - Email: `bob@example.com`
   - Password: `password123`
   - Name: `Bob Jones`

#### Send Friend Request

```javascript
// As Bob, send request to Alice
const response = await fetch('/api/friends/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ receiverUsername: 'alice' })
});

const data = await response.json();
console.log('Friend request sent:', data);
```

#### Accept Friend Request

1. Logout Bob and login as Alice
2. Check incoming requests:
   ```javascript
   const response = await fetch('/api/friends/requests?type=received');
   const requests = await response.json();
   console.log('Incoming requests:', requests);
   ```

3. Accept the request:
   ```javascript
   const requestId = requests[0].id;
   await fetch(`/api/friends/requests/${requestId}`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action: 'accept' })
   });
   ```

4. View friends list:
   ```javascript
   const response = await fetch('/api/friends');
   const friends = await response.json();
   console.log('Friends:', friends);
   ```

---

## Step 7: Use the Test Script (Optional)

Load the test script in your browser console:

```bash
# First, make the test script accessible
# Option 1: Import in a page component
# Option 2: Run in browser console after copying content
```

Then run:
```javascript
// Assuming friendSystemTest is loaded
await friendSystemTest.runFullTest();
```

---

## 🎉 Success!

You now have:
- ✅ Custom authentication working
- ✅ User registration and login
- ✅ Friend request system
- ✅ Cassandra database configured

---

## Next Steps

### Build UI Components

1. **Friends List Page**
   ```tsx
   // app/friends/page.tsx
   // Fetch and display friends using /api/friends
   ```

2. **Friend Requests Page**
   ```tsx
   // app/friend-requests/page.tsx
   // Show pending requests using /api/friends/requests
   ```

3. **Add Friend Modal**
   ```tsx
   // components/modals/AddFriendModal.tsx
   // Form to send friend request
   ```

4. **Friend Request Notifications**
   ```tsx
   // components/FriendRequestBadge.tsx
   // Show count of pending requests
   ```

### Integrate with Existing Features

1. **Direct Messages**: Use friends list for DM conversations
2. **Server Invites**: Prioritize friends in invite suggestions
3. **User Search**: Add friend status to search results
4. **Profile Pages**: Show mutual friends and friend status

---

## Troubleshooting

### Cassandra Connection Failed
```bash
# Check if Cassandra is running
docker ps | grep cassandra

# Check logs
docker logs cassandra

# Restart Cassandra
docker restart cassandra
```

### Authentication Not Working
1. Check `.env` has `JWT_SECRET` set
2. Clear browser cookies
3. Check browser console for errors
4. Verify database has user tables

### Database Errors
```bash
# Verify keyspace exists
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES;"

# Re-apply schema
docker exec -it cassandra cqlsh -f /schema.cql
```

### Port Already in Use
```bash
# Change Next.js port
npm run dev -- -p 3001

# Or kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

---

## Documentation Reference

- **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** - Full API documentation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Architecture overview
- **[schema.cql](./schema.cql)** - Database schema
- **[README.md](./README.md)** - Project overview

---

## Support

If you encounter issues:
1. Check the documentation files
2. Review error messages in console/terminal
3. Verify environment variables are set correctly
4. Ensure Cassandra is running and schema is applied

---

**Happy Coding! 🎉**
