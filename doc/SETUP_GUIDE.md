# Complete Setup Guide for Discord Clone

## ✅ Step 1: Cassandra Setup (COMPLETED)

Your Cassandra cluster is now running with:
- 3 healthy nodes (cassandra-1, cassandra-2, cassandra-3)
- Keyspace: `discord_app`
- All 15 tables created successfully

### Verify Cassandra
```bash
# Check cluster status
docker exec -it cassandra-1 nodetool status

# Access Cassandra shell
docker exec -it cassandra-1 cqlsh

# List all tables
docker exec -it cassandra-1 cqlsh -e "USE discord_app; DESCRIBE TABLES;"
```

### Stop/Start Cassandra
```bash
# Stop cluster
docker-compose down

# Start cluster (keeps data)
docker-compose up -d

# Reset cluster (deletes all data)
docker-compose down -v
docker-compose up -d
```

---

## Step 2: Clerk Authentication Setup

Clerk provides user authentication with social logins and user management.

### 2.1 Create Clerk Account

1. **Go to** https://clerk.com/
2. **Click** "Sign Up" (top right)
3. **Sign up** using:
   - Google account (recommended)
   - GitHub account
   - Or email

### 2.2 Create Your Application

1. After sign up, click **"+ Create application"**
2. **Application name**: "Discord Clone" (or your choice)
3. **Choose authentication methods**:
   - ✅ Email
   - ✅ Google (recommended)
   - ✅ GitHub (optional)
   - ✅ Discord (optional for Discord-like experience)
4. Click **"Create application"**

### 2.3 Get API Keys

1. In your Clerk Dashboard, go to **"API Keys"** (left sidebar)
2. Copy the following keys:

   **Publishable Key** (starts with `pk_test_...`)
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   **Secret Key** (starts with `sk_test_...`)
   ```
   CLERK_SECRET_KEY=sk_test_...
   ```

### 2.4 Configure Redirect URLs

In Clerk Dashboard → **Paths**:

- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in**: `/`
- **After sign-up**: `/`

Your `.env` values:
```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 2.5 Free Tier Limits
- ✅ Up to 10,000 monthly active users
- ✅ All authentication methods
- ✅ Full user management

---

## Step 3: UploadThing Setup (File Uploads)

UploadThing handles image/file uploads for avatars, server icons, and attachments.

### 3.1 Create UploadThing Account

1. **Go to** https://uploadthing.com/
2. **Click** "Sign In" → "Continue with GitHub"
3. **Authorize** UploadThing to access your GitHub

### 3.2 Create Your App

1. Click **"Create a new app"**
2. **App name**: "discord-clone" (or your choice)
3. **Region**: Choose closest to you
   - US East (recommended for most)
   - EU West
   - Asia Pacific
4. Click **"Create"**

### 3.3 Get API Keys

1. In your app dashboard, go to **"API Keys"** tab
2. Copy:

   **Secret Key** (starts with `sk_live_...` or `sk_test_...`)
   ```
   UPLOADTHING_SECRET=sk_...
   ```

   **App ID**
   ```
   UPLOADTHING_APP_ID=your-app-id
   ```

### 3.4 Configure File Types (Optional)

In UploadThing Dashboard → **File Routes**:
- Max file size: 4MB (free tier)
- Allowed types: Images (png, jpg, jpeg, gif)
- Can add PDF for file attachments

### 3.5 Free Tier Limits
- ✅ 2GB storage
- ✅ 2GB bandwidth per month
- ✅ Up to 4MB per file

---

## Step 4: LiveKit Setup (Video/Audio)

LiveKit provides real-time video and audio chat for channels.

### 4.1 Create LiveKit Cloud Account

1. **Go to** https://livekit.io/
2. **Click** "Get Started" → "Sign Up"
3. **Sign up** with:
   - GitHub (recommended)
   - Google
   - Email

### 4.2 Create a Project

1. After login, click **"New Project"**
2. **Project name**: "Discord Clone"
3. **Region**: Choose closest to you
   - US (recommended)
   - EU
   - Asia
4. Click **"Create"**

### 4.3 Get API Keys

1. In your project dashboard, go to **"Settings"** → **"Keys"**
2. Click **"Create New Key"**
3. Copy:

   **API Key** (starts with `API...`)
   ```
   LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
   ```

   **API Secret** (starts with `whp...`)
   ```
   LIVEKIT_API_SECRET=whpxxxxxxxxxxxxx
   ```

   **WebSocket URL** (your LiveKit server URL)
   ```
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

### 4.4 Free Tier Limits
- ✅ 10,000 participant minutes per month
- ✅ Up to 20 concurrent participants
- ✅ HD video quality
- ✅ Perfect for testing and small deployments

---

## Step 5: Install Dependencies

```bash
cd /home/tienmanh/Master/251/database/assignment/Discord

# Install Node.js dependencies
npm install

# Install Cassandra driver
npm install cassandra-driver

# Install UUID for generating IDs
npm install uuid
npm install --save-dev @types/uuid
```

---

## Step 6: Configure Environment Variables

Edit your `.env` file with all the keys you collected:

```env
# Cassandra (already configured)
# No DATABASE_URL needed for Cassandra

# Upload Images Into Uploadthing
UPLOADTHING_SECRET=sk_live_xxxxxxxxxxxxx
UPLOADTHING_APP_ID=xxxxxxxxxxxxx

# For Initialization Of Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# For Live Video Streaming
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=whpxxxxxxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## Step 7: Verify Setup

### Check Cassandra Connection
Create a test file `test-cassandra.js`:

```javascript
const { Client } = require('cassandra-driver');

const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});

async function test() {
  try {
    const result = await client.execute('SELECT * FROM profiles_by_id LIMIT 1');
    console.log('✅ Cassandra connection successful!');
    console.log('Tables exist and are accessible');
    await client.shutdown();
  } catch (error) {
    console.error('❌ Cassandra connection failed:', error.message);
    process.exit(1);
  }
}

test();
```

Run:
```bash
node test-cassandra.js
```

---

## Step 8: Run the Development Server

```bash
# Development mode
npm run dev

# Or with specific port
npm run dev -- -p 3000
```

Open http://localhost:3000 in your browser.

---

## Troubleshooting

### Cassandra Issues

**Container won't start:**
```bash
# Check logs
docker logs cassandra-1

# Restart cluster
docker-compose restart
```

**Connection refused:**
```bash
# Check if port 9042 is open
docker ps | grep cassandra

# Verify health
docker exec -it cassandra-1 nodetool status
```

### Clerk Issues

**"Invalid API Key":**
- Make sure you copied the full key
- Check for extra spaces
- Use the test keys (pk_test_... and sk_test_...)

**Redirect not working:**
- Verify paths in Clerk Dashboard match your .env
- Clear browser cache
- Check Next.js middleware configuration

### UploadThing Issues

**Upload fails:**
- Check file size (max 4MB on free tier)
- Verify API keys are correct
- Check allowed file types in UploadThing dashboard

### LiveKit Issues

**Video not connecting:**
- Verify WebSocket URL starts with `wss://`
- Check API key and secret are correct
- Ensure project is active in LiveKit dashboard

---

## Quick Reference: Service Dashboards

- **Clerk**: https://dashboard.clerk.com/
- **UploadThing**: https://uploadthing.com/dashboard
- **LiveKit**: https://cloud.livekit.io/

---

## Next Steps After Setup

1. ✅ All services configured
2. Start migrating database queries from Prisma to Cassandra
3. Follow `MIGRATION_GUIDE.md` for step-by-step code changes
4. Use `CASSANDRA_QUICK_REFERENCE.md` for query examples

---

## Cost Summary (Monthly)

| Service | Free Tier | Paid Plans Start At |
|---------|-----------|---------------------|
| Cassandra (Docker) | Free (local) | N/A |
| Clerk | 10,000 MAU | $25/month |
| UploadThing | 2GB storage/bandwidth | $10/month |
| LiveKit | 10,000 mins | $0.0009/min |
| **Total** | **$0** | ~$35+/month |

All services have generous free tiers perfect for development and testing!
