# Custom Authentication Components

This document describes all custom components created to replace Clerk authentication functionality.

---

## 🎯 Components Overview

All Clerk components have been replaced with custom implementations that work with JWT-based authentication and Cassandra database.

---

## 📦 Available Components

### 1. **UserButton** (`components/UserButton.tsx`)

Replaces: `<UserButton />` from `@clerk/nextjs`

**Purpose**: User profile dropdown with logout and friend management

**Features**:
- Avatar with fallback initials
- User name and username display
- Add Friend action
- Navigate to Friends page
- Logout functionality
- Loading state with skeleton

**Usage**:
```tsx
import { UserButton } from "@/components/UserButton";

export default function Navigation() {
  return (
    <div>
      <UserButton />
    </div>
  );
}
```

**Props**: None (automatically fetches current user)

---

### 2. **ProfileAvatar** (`components/ProfileAvatar.tsx`)

Replaces: Clerk's user avatar functionality

**Purpose**: Display user avatar with automatic fallback to initials

**Features**:
- Fetches current user if no props provided
- Shows user image or fallback initials
- Customizable size and styling
- Loading skeleton
- Can be used with or without data

**Usage**:
```tsx
import { ProfileAvatar } from "@/components/ProfileAvatar";

// Auto-fetch current user
<ProfileAvatar />

// With provided data
<ProfileAvatar 
  userId="123"
  name="John Doe"
  imageUrl="https://..."
  className="h-12 w-12"
/>
```

**Props**:
- `userId?: string` - User ID for display
- `name?: string` - User name (used for fallback letter)
- `imageUrl?: string` - Avatar image URL
- `className?: string` - Custom styling for avatar
- `fallbackClassName?: string` - Custom styling for fallback

---

### 3. **UserAvatar** (`components/UserAvatar.tsx`)

Replaces: Generic avatar component

**Purpose**: Simple avatar component with fallback

**Features**:
- Image with fallback to initial letter
- Responsive sizing
- Consistent styling with theme

**Usage**:
```tsx
import UserAvatar from "@/components/UserAvatar";

<UserAvatar 
  src={user.imageUrl}
  name={user.name}
  className="h-8 w-8"
/>
```

**Props**:
- `src?: string` - Image URL
- `name?: string` - Name for fallback
- `className?: string` - Custom styling

---

### 4. **AuthGuard** (`components/AuthGuard.tsx`)

Replaces: Client-side route protection (complements server-side middleware)

**Purpose**: Protect client components from unauthenticated access

**Features**:
- Automatic redirect to sign-in
- Custom loading fallback
- Custom redirect path
- Session validation

**Usage**:
```tsx
import { AuthGuard } from "@/components/AuthGuard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <ProtectedContent />
    </AuthGuard>
  );
}

// With custom redirect
<AuthGuard redirectTo="/login">
  <Content />
</AuthGuard>

// With custom loading
<AuthGuard fallback={<CustomLoader />}>
  <Content />
</AuthGuard>
```

**Props**:
- `children: ReactNode` - Content to protect
- `fallback?: ReactNode` - Custom loading component
- `redirectTo?: string` - Custom redirect path (default: "/sign-in")

---

## 🪝 Custom Hooks

### 5. **useAuth** (`hooks/useAuth.ts`)

Replaces: `useUser()`, `useAuth()` from `@clerk/nextjs`

**Purpose**: Access authentication state and user data in client components

**Features**:
- Current user data
- Authentication state
- Login/logout functions
- Refresh user data
- Loading states

**Usage**:
```tsx
import { useAuth } from "@/hooks/useAuth";

export default function MyComponent() {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    login, 
    logout,
    refreshUser 
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  const handleLogin = async () => {
    try {
      await login("username", "password");
      console.log("Logged in!");
    } catch (error) {
      console.error("Login failed");
    }
  };

  const handleLogout = async () => {
    await logout(); // Redirects to sign-in
  };

  return (
    <div>
      <h1>Hello, {user.name}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

**Returns**:
- `user: User | null` - Current user object
- `isLoading: boolean` - Loading state
- `isAuthenticated: boolean` - Authentication status
- `login: (username, password) => Promise<void>` - Login function
- `logout: () => Promise<void>` - Logout function
- `refreshUser: () => Promise<void>` - Refresh user data

**User Object**:
```typescript
interface User {
  id: string;
  userId: string;
  username: string;
  email: string;
  name: string;
  imageUrl: string | null;
}
```

---

## 📄 Authentication Pages

### 6. **Sign In Page** (`app/(auth)/(routes)/sign-in/page.tsx`)

Replaces: `<SignIn />` from `@clerk/nextjs`

**Features**:
- Username/password login
- Error handling
- Loading states
- Redirect to main app on success
- Link to sign-up page
- Beautiful Discord-themed UI

**Route**: `/sign-in`

---

### 7. **Sign Up Page** (`app/(auth)/(routes)/sign-up/page.tsx`)

Replaces: `<SignUp />` from `@clerk/nextjs`

**Features**:
- User registration with username, email, name, password
- Password confirmation
- Form validation
- Error handling
- Redirect to sign-in on success
- Link to sign-in page
- Beautiful Discord-themed UI

**Route**: `/sign-up`

---

## 🔧 Server-Side Utilities

### 8. **currentProfile** (`lib/currentProfile.ts`)

Replaces: `auth()`, `currentUser()` from Clerk

**Purpose**: Get authenticated user in Server Components and API routes

**Usage**:
```tsx
import { currentProfile } from "@/lib/currentProfile";

export default async function ServerPage() {
  const profile = await currentProfile();
  
  if (!profile) {
    return redirect("/sign-in");
  }

  return <div>Hello, {profile.name}</div>;
}
```

---

### 9. **currentProfilePage** (`lib/currentProfilePage.ts`)

Replaces: `getAuth()` from Clerk

**Purpose**: Get authenticated user in Pages API routes

**Usage**:
```typescript
import { currentProfilePage } from "@/lib/currentProfilePage";

export default async function handler(req, res) {
  const profile = await currentProfilePage(req);
  
  if (!profile) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({ user: profile });
}
```

---

## 🔄 Migration Guide

### Clerk → Custom Component Mapping

| Clerk Component | Custom Replacement |
|----------------|-------------------|
| `<UserButton />` | `<UserButton />` (custom) |
| `<SignIn />` | `/sign-in` page |
| `<SignUp />` | `/sign-up` page |
| `<RedirectToSignIn />` | `redirect("/sign-in")` |
| `useUser()` | `useAuth()` |
| `useAuth()` | `useAuth()` |
| `auth()` | `currentProfile()` |
| `currentUser()` | `currentProfile()` |
| `getAuth()` | `currentProfilePage()` |
| `<ClerkProvider>` | Removed |
| `authMiddleware()` | Custom middleware |

---

## 💡 Usage Examples

### Example 1: Protected Client Component

```tsx
"use client";

import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Example 2: Protected Server Component

```tsx
import { currentProfile } from "@/lib/currentProfile";
import { redirect } from "next/navigation";

export default async function ServerPage() {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  return (
    <div>
      <h1>Server Page</h1>
      <p>Logged in as: {profile.name}</p>
    </div>
  );
}
```

### Example 3: API Route Protection

```typescript
import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";

export async function GET() {
  const profile = await currentProfile();

  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ data: "secret data" });
}
```

### Example 4: User Avatar Display

```tsx
import { ProfileAvatar } from "@/components/ProfileAvatar";

export function UserCard({ userId, name, imageUrl }) {
  return (
    <div className="flex items-center gap-2">
      <ProfileAvatar 
        userId={userId}
        name={name}
        imageUrl={imageUrl}
        className="h-10 w-10"
      />
      <span>{name}</span>
    </div>
  );
}
```

---

## 🎨 Theming

All components use the existing Discord dark theme with:
- `bg-[#1e1f22]` for dark backgrounds
- `bg-white` for light backgrounds
- `text-zinc-500` for muted text
- `hover:bg-zinc-800` for hover states
- Indigo accent colors (`bg-indigo-500`)
- Smooth transitions

Components are fully responsive and support both light and dark modes.

---

## 🔒 Security Features

1. **HTTP-only Cookies**: Auth tokens stored securely
2. **JWT Validation**: All requests validated server-side
3. **CSRF Protection**: SameSite cookie policy
4. **Password Hashing**: bcryptjs with 10 rounds
5. **Token Expiration**: 7-day JWT expiry
6. **Middleware Protection**: Server-side route guards

---

## 📚 Additional Resources

- **Authentication Guide**: See `AUTHENTICATION_GUIDE.md`
- **API Documentation**: See `QUICK_START.md`
- **Migration Summary**: See `CLERK_REMOVAL_SUMMARY.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Component Checklist

- [x] UserButton - User dropdown menu
- [x] ProfileAvatar - Smart avatar component
- [x] UserAvatar - Simple avatar component  
- [x] AuthGuard - Client-side route protection
- [x] useAuth - Authentication hook
- [x] Sign In Page - Login UI
- [x] Sign Up Page - Registration UI
- [x] currentProfile - Server-side auth
- [x] currentProfilePage - Pages API auth
- [x] Custom middleware - Route protection

**All components are production-ready and fully replace Clerk functionality!**
