<h1>Fullstack Discord Clone with Cassandra, Custom Authentication & Friend System</h1>

<h2>🎉 NEW: Custom Authentication & Friend Management System</h2>

This project has been enhanced with:
- ✅ **Custom JWT-based authentication**
- ✅ **Username/password registration and login**
- ✅ **Friend request system** (send, accept, reject, cancel)
- ✅ **Friends list management** with Cassandra database
- ✅ **Complete API endpoints** for user and friend operations

<h3>📚 Documentation</h3>

- **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** - Complete API documentation and usage guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details and architecture
- **[QUERIES_SUMMARY.md](./doc/QUERIES_SUMMARY.md)** - Technical explanation of database queries
- **[schema.cql](./schema.cql)** - Full Cassandra database schema

<h3>!!! --- WebSocket Polling Mode on Vercel --- !!!</h3>

<h4>Original Project Credit: <a href="https://www.youtube.com/@codewithantonio">Code With Antonio</a></h4>

---

## 🚀 Build & Run Guide

Follow these steps to set up the project locally.

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/tienmanh2904/data_engineer.git
cd data_engineer

# Install dependencies
npm install

# Install specific dependencies if missing
npm install cassandra-driver uuid
npm install --save-dev @types/uuid
```

### Step 2: Cassandra Database Setup

You need a running Cassandra instance. Docker is recommended.

```bash
# Start Cassandra using Docker Compose
docker-compose up -d

# Wait ~5 minutes for initialization, then check status
docker exec -it cassandra-1 nodetool status
# Expect 'UN' (Up/Normal) status for all nodes

# Initialize Schema
docker exec -it cassandra-1 cqlsh -f /schema.cql
```

**Verify Cassandra:**
```bash
# Enter CQL shell
docker exec -it cassandra-1 cqlsh -e "USE discord_app; DESCRIBE TABLES;"
```

### Step 3: UploadThing Setup (File Uploads)

Handles avatars and attachments.

1. **Create Account:** Go to [UploadThing](https://uploadthing.com/).
2. **Create App:** Name it "discord-clone".
3. **Get API Keys:** From "API Keys" tab:
   - `UPLOADTHING_SECRET`
   - `UPLOADTHING_APP_ID`

### Step 4: LiveKit Setup (Video/Audio)

Handles real-time voice and video channels.

1. **Create Account:** Go to [LiveKit](https://livekit.io/).
2. **Create Project:** Name it "Discord Clone".
3. **Get API Keys:** From Settings → Keys:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `NEXT_PUBLIC_LIVEKIT_URL` (WebSocket URL)

### Step 5: Environment Configuration

Create a `.env` file in the root directory and fill in your keys:

```env
# Cassandra Database (No env needed for local docker default)

# UploadThing
UPLOADTHING_SECRET=sk_...
UPLOADTHING_APP_ID=...

# Custom Auth
JWT_SECRET=your-super-secret-key-here

# LiveKit
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=whp...
NEXT_PUBLIC_LIVEKIT_URL=wss://...
```

### Step 6: Run the Application

```bash
# Development mode
npm run build
npm run dev
```

Visit `http://localhost:3000` to see your app!

---

## ✅ Verify Setup

Create a test file `test-cassandra.js` to verify database connectivity:

```javascript
const { Client } = require('cassandra-driver');

const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Cassandra connection successful!');
    await client.shutdown();
  } catch (error) {
    console.error('❌ Cassandra connection failed:', error.message);
  }
}
test();
```

Run with `node test-cassandra.js`.

---

## 🔧 Troubleshooting

### Cassandra Issues
- **Container won't start:** Run `docker logs cassandra-1` to see errors. Try `docker-compose restart`.
- **Connection refused:** Ensure port 9042 is exposed. Check `docker ps`.

### Application Issues
- **Upload fails:** Check file size (max 4MB Free Tier) and `UPLOADTHING_APP_ID`.
- **Video not connecting:** Ensure `NEXT_PUBLIC_LIVEKIT_URL` starts with `wss://`.

---

## 🎯 New Features & API

### Authentication System
- **Register**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Session**: `GET /api/auth/session`

### Friend System
- **Send Request**: `POST /api/friends/requests`
- **Manage Requests**: `GET`, `PATCH`, `DELETE` /api/friends/requests/[id]
- **List Friends**: `GET /api/friends`

Full API documentation: [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)

---

## 🗄️ Database Schema overview

This project uses **Apache Cassandra**.

- **Users**: `users_by_id`, `users_by_username`, `users_by_email`
- **Friends**: `friend_requests_*`, `friends_by_user`
- **Servers**: `servers_by_*`, `channels_by_*`, `members_by_*`
- **Messages**: `messages_by_*`, `direct_messages_by_*`

View full schema: [schema.cql](./schema.cql)

---

## 🧪 Testing

Use the provided test script:

```typescript
import { runFullTest } from './test-friend-system';
await runFullTest();
```

---

## 📦 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Authentication**: Custom JWT
- **Database**: Apache Cassandra
- **Real-time**: Socket.IO, LiveKit

---

## Service Dashboards

- **UploadThing**: [uploadthing.com/dashboard](https://uploadthing.com/dashboard)
- **LiveKit**: [cloud.livekit.io](https://cloud.livekit.io/)

---

## 📄 License & Credits

- Original Discord Clone: [Code With Antonio](https://www.youtube.com/@codewithantonio)
- Open Source under MIT License
- Enhanced by tienmanh2904

**Happy Coding! 🎉**
