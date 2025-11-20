# Setup Checklist - Discord Clone with Cassandra

## ✅ Completed Tasks

### 1. Cassandra Database ✅
- [x] Docker containers running (3 nodes)
- [x] Keyspace `discord_app` created
- [x] All 16 tables created successfully
- [x] Connection tested and working
- [x] Cassandra driver installed

**Verify:**
```bash
docker ps | grep cassandra  # Should show 3 healthy containers
node test-cassandra.js      # Should pass all tests
```

### 2. Node.js Dependencies ✅
- [x] cassandra-driver installed
- [x] uuid installed
- [x] @types/uuid installed

**Verify:**
```bash
npm list cassandra-driver uuid
```

---

## 📋 Remaining Tasks

### 3. External Services Setup ⏳

#### A. Clerk (Authentication)
**Status:** ⏳ **TO DO**

**Steps:**
1. Go to https://clerk.com/ and sign up
2. Create new application "Discord Clone"
3. Enable authentication methods (Email, Google, etc.)
4. Copy API keys to `.env`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```
5. Configure redirect URLs in Clerk dashboard

**Estimated Time:** 5-10 minutes  
**Documentation:** See `SETUP_GUIDE.md` Step 2

---

#### B. UploadThing (File Uploads)
**Status:** ⏳ **TO DO**

**Steps:**
1. Go to https://uploadthing.com/ and sign in with GitHub
2. Create new app "discord-clone"
3. Copy API keys to `.env`:
   ```env
   UPLOADTHING_SECRET=sk_xxxxx
   UPLOADTHING_APP_ID=xxxxx
   ```

**Estimated Time:** 3-5 minutes  
**Documentation:** See `SETUP_GUIDE.md` Step 3

---

#### C. LiveKit (Video/Audio)
**Status:** ⏳ **TO DO**

**Steps:**
1. Go to https://livekit.io/ and sign up
2. Create new project "Discord Clone"
3. Create API key in Settings → Keys
4. Copy credentials to `.env`:
   ```env
   LIVEKIT_API_KEY=APIxxxxx
   LIVEKIT_API_SECRET=whpxxxxx
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

**Estimated Time:** 5-10 minutes  
**Documentation:** See `SETUP_GUIDE.md` Step 4

---

### 4. Environment Configuration ⏳

**Current `.env` status:**
- [x] DATABASE_URL - Not needed for Cassandra
- [ ] UPLOADTHING_SECRET - Need to add
- [ ] UPLOADTHING_APP_ID - Need to add
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY - Need to add
- [ ] CLERK_SECRET_KEY - Need to add
- [x] CLERK redirect URLs - Already configured
- [ ] LIVEKIT_API_KEY - Need to add
- [ ] LIVEKIT_API_SECRET - Need to add
- [ ] NEXT_PUBLIC_LIVEKIT_URL - Need to add

**Action Required:**
Edit `/home/tienmanh/Master/251/database/assignment/Discord/.env` and fill in the missing values.

---

### 5. Code Migration ⏳

**Status:** ⏳ **NOT STARTED**

After all services are configured, start migrating code from Prisma to Cassandra:

**Priority Order:**
1. [ ] Create TypeScript types (`types/cassandra.ts`)
2. [ ] Update `lib/currentProfile.ts`
3. [ ] Update `lib/initialProfile.ts`
4. [ ] Update `lib/currentProfilePage.ts`
5. [ ] Update `lib/conversation.ts`
6. [ ] Update API routes (see `MIGRATION_GUIDE.md`)
7. [ ] Update components
8. [ ] Remove Prisma dependencies

**Documentation:**
- `MIGRATION_GUIDE.md` - Detailed migration instructions
- `CASSANDRA_QUICK_REFERENCE.md` - Code snippets
- `MIGRATION_SUMMARY.md` - Overview

---

## 🚀 Quick Start Commands

### Start Everything
```bash
# Start Cassandra
docker-compose up -d

# Verify Cassandra
node test-cassandra.js

# Install dependencies (if not done)
npm install

# Start development server (after .env is configured)
npm run dev
```

### Stop Everything
```bash
# Stop Next.js (Ctrl+C in terminal)

# Stop Cassandra
docker-compose down

# Stop and delete data
docker-compose down -v
```

### Useful Commands
```bash
# Check Cassandra logs
docker logs cassandra-1

# Access Cassandra shell
docker exec -it cassandra-1 cqlsh

# Check cluster status
docker exec -it cassandra-1 nodetool status

# View all tables
docker exec -it cassandra-1 cqlsh -e "USE discord_app; DESCRIBE TABLES;"
```

---

## 📊 Progress Tracker

### Overall Progress: 30% Complete

- ✅ **Database Setup:** 100% (Cassandra ready)
- ✅ **Dependencies:** 100% (All packages installed)
- ⏳ **External Services:** 0% (Need Clerk, UploadThing, LiveKit)
- ⏳ **Environment Config:** 0% (Need to fill .env)
- ⏳ **Code Migration:** 0% (Not started)

---

## ⏭️ Next Steps

1. **Register for external services** (15-20 minutes total)
   - Clerk for authentication
   - UploadThing for file uploads
   - LiveKit for video/audio

2. **Update `.env` file** with all API keys

3. **Test the setup** by running:
   ```bash
   npm run dev
   ```

4. **Start code migration** following `MIGRATION_GUIDE.md`

---

## 📚 Documentation Files

- `SETUP_GUIDE.md` - Complete setup instructions for all services
- `MIGRATION_GUIDE.md` - Step-by-step code migration guide
- `MIGRATION_SUMMARY.md` - Migration overview and estimates
- `CASSANDRA_QUICK_REFERENCE.md` - Ready-to-use code snippets
- `schema.cql` - Cassandra database schema
- `test-cassandra.js` - Database connection test script

---

## 🆘 Need Help?

### Cassandra Issues
- Check Docker: `docker ps`
- Check logs: `docker logs cassandra-1`
- Restart: `docker-compose restart`

### Service Registration Issues
- See detailed instructions in `SETUP_GUIDE.md`
- All services have free tiers
- No credit card required for initial setup

### Code Migration Questions
- Refer to `MIGRATION_GUIDE.md` for examples
- Use `CASSANDRA_QUICK_REFERENCE.md` for common patterns
- Check existing Prisma code and compare with Cassandra equivalents

---

**Ready to continue?** 
Follow the steps in `SETUP_GUIDE.md` to register for Clerk, UploadThing, and LiveKit! 🚀
