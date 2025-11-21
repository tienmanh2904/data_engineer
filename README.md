<h1>Fullstack Discord Clone with Cassandra, Custom Authentication & Friend System</h1>

<h2>🎉 NEW: Custom Authentication & Friend Management System</h2>

This project has been enhanced with:
- ✅ **Custom JWT-based authentication** (replacing Clerk)
- ✅ **Username/password registration and login**
- ✅ **Friend request system** (send, accept, reject, cancel)
- ✅ **Friends list management** with Cassandra database
- ✅ **Complete API endpoints** for user and friend operations

<h3>📚 Documentation</h3>

- **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** - Complete API documentation and usage guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details and architecture
- **[schema.cql](./schema.cql)** - Full Cassandra database schema

<h3>!!! --- WebSocket Polling Mode on Vercel --- !!!</h3>

<h4>Original Project Credit: <a href="https://www.youtube.com/@codewithantonio">Code With Antonio</a></h4>

---

## 🚀 Quick Start

### Cloning the repository
```bash
git clone https://github.com/tienmanh2904/data_engineer.git
cd data_engineer
```

### Install Dependencies
```bash
npm install
```

### Setup Cassandra Database
```bash
# Start Cassandra (Docker recommended)
docker-compose up -d

# Wait 5 minutes
docker exec -it cassandra-1 nodetool status
# Correct output will show 3 nodes with UN
UN  172.18.0.2  75.5 KiB   16      100.0%            xxxx-xxxx-xxxx-xxxx                   rack1
UN  172.18.0.3  75.5 KiB   16      100.0%            yyyy-yyyy-yyyy-yyyy                   rack1
UN  172.18.0.4  75.5 KiB   16      100.0%

docker exec -it cassandra-1 ls -la /schema.cql
docker exec -it cassandra-1 cqlsh -f /schema.cql
```

### Setup Environment Variables (.env)
```bash
# Cassandra Database
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_LOCAL_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=discord_app

# JWT Authentication (IMPORTANT: Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Upload Images (UploadThing)
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id

# Live Video Streaming (LiveKit)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
NEXT_PUBLIC_LIVEKIT_URL=your-livekit-url

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Start the Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and create your account!

---

## 🎯 New Features

### Authentication System
- **Register**: Create account with username, email, and password
- **Login**: Secure JWT-based authentication
- **Session Management**: HTTP-only cookies for security
- **Route Protection**: Middleware-based authentication

### Friend System
- **Send Friend Requests** by username
- **Accept/Reject Requests** from other users
- **View Friends List** with user details
- **Remove Friends** when needed
- **Cancel Sent Requests** before acceptance

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/session` - Get current session

### Friends
- `GET /api/friends` - Get all friends
- `DELETE /api/friends/[friendId]` - Remove a friend

### Friend Requests
- `POST /api/friends/requests` - Send friend request
- `GET /api/friends/requests` - Get all requests (sent & received)
- `PATCH /api/friends/requests/[requestId]` - Accept/reject request
- `DELETE /api/friends/requests/[requestId]` - Cancel request

Full API documentation: [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)

---

## 🗄️ Database Schema

This project uses **Apache Cassandra** for scalability and performance. The schema includes:

### User Tables
- `users_by_id` - Main user storage
- `users_by_username` - Login lookups
- `users_by_email` - Email lookups

### Friend Tables
- `friend_requests_by_id` - Main request storage
- `friend_requests_by_sender` - Sent requests view
- `friend_requests_by_receiver` - Received requests view
- `friend_requests_by_users` - Quick existence check
- `friends_by_user` - Friends list per user

### Server Tables
- `servers_by_id`, `servers_by_profile`, `servers_by_invite_code`
- `channels_by_id`, `channels_by_server`
- `members_by_id`, `members_by_server`, `members_by_profile_and_server`

### Messaging Tables
- `messages_by_id`, `messages_by_channel`
- `direct_messages_by_id`, `direct_messages_by_conversation`
- `conversations_by_id`, `conversations_by_members`

View full schema: [schema.cql](./schema.cql)

---

## 🧪 Testing the Friend System

Use the provided test script:

```typescript
// In browser console or Node.js
import { runFullTest } from './test-friend-system';

// Run complete test flow
await runFullTest();

// Or test individual functions
import { testRegister, testLogin, testSendFriendRequest } from './test-friend-system';

await testRegister('username', 'email@example.com', 'password');
await testLogin('username', 'password');
await testSendFriendRequest('friendUsername');
```

---

## 🔒 Security Features

- **Password Hashing**: bcryptjs with 10 rounds
- **JWT Tokens**: Signed with secret key, 7-day expiration
- **HTTP-only Cookies**: Protection against XSS attacks
- **CSRF Protection**: SameSite cookie policy
- **Route Middleware**: Automatic authentication checks
- **Input Validation**: Server-side validation on all endpoints

---

## 📦 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Authentication**: Custom JWT-based auth (bcrypt + jsonwebtoken)
- **Database**: Apache Cassandra (cassandra-driver)
- **File Upload**: UploadThing
- **Video/Audio**: LiveKit
- **Real-time**: Socket.IO
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod

---

## 🛠️ Development

### Project Structure
```
app/
  ├── (auth)/              # Authentication pages
  ├── (main)/              # Main application
  ├── api/
  │   ├── auth/           # Auth endpoints
  │   ├── friends/        # Friend system endpoints
  │   ├── server/         # Server management
  │   └── messages/       # Messaging
components/
  ├── modals/             # Modal components
  ├── navigation/         # Navigation UI
  ├── server/             # Server components
  └── ui/                 # Reusable UI components
lib/
  ├── currentProfile.ts   # Session management
  ├── db.ts              # Cassandra connection
  └── utils.ts           # Utility functions
types/
  ├── cassandra.ts       # Database types
  ├── friends.ts         # Friend system types
  └── ServerType.ts      # Server types
```

### Adding New Features

1. **Database**: Update `schema.cql` with new tables
2. **Types**: Add TypeScript types in `types/`
3. **API**: Create routes in `app/api/`
4. **Components**: Build UI in `components/`
5. **Documentation**: Update relevant .md files

---

## 🚀 Deployment

### Cassandra Setup
For production, use:
- [DataStax Astra DB](https://astra.datastax.com/) (Managed Cassandra)
- Self-hosted Cassandra cluster
- Docker Compose with multiple nodes

### Environment Variables
Make sure to set strong production values for:
- `JWT_SECRET` - Use a cryptographically secure random string
- Database credentials
- API keys for third-party services

### Next.js Deployment
Deploy to Vercel, AWS, or any Node.js hosting:
```bash
npm run build
npm start
```

---

## 📝 Migration from Clerk

If you have existing Clerk data:

1. Export user data from Clerk
2. Create migration script to populate `users_by_*` tables
3. Update all Clerk auth() calls to use currentProfile()
4. Remove Clerk dependencies: `npm uninstall @clerk/nextjs`
5. Test authentication flow thoroughly

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙏 Credits

- Original Discord Clone: [Code With Antonio](https://www.youtube.com/@codewithantonio)
- Custom Auth & Friends: Enhanced by tienmanh2904
- Database Migration: Cassandra implementation

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check documentation files in the repository
- Review [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for detailed API docs

---

**Happy Coding! 🎉**
