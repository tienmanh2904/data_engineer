import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { username, email, password, name } = await req.json();

    // Validate input
    if (!username || !email || !password) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if username already exists
    const existingUsername = await db.execute(
      'SELECT * FROM users_by_username WHERE username = ?',
      [username.toLowerCase()],
      { prepare: true }
    );

    if (existingUsername.rows.length > 0) {
      return new NextResponse("Username already exists", { status: 409 });
    }

    // Check if email already exists
    const existingEmail = await db.execute(
      'SELECT * FROM users_by_email WHERE email = ?',
      [email.toLowerCase()],
      { prepare: true }
    );

    if (existingEmail.rows.length > 0) {
      return new NextResponse("Email already exists", { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user ID
    const userId = uuidv4();
    const now = new Date();

    // Insert into all user tables
    const queries = [
      {
        query: `INSERT INTO users_by_id (id, username, email, password_hash, name, image_url, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [userId, username.toLowerCase(), email.toLowerCase(), passwordHash, name || username, null, now, now]
      },
      {
        query: `INSERT INTO users_by_username (username, id, email, password_hash, name, image_url, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [username.toLowerCase(), userId, email.toLowerCase(), passwordHash, name || username, null, now, now]
      },
      {
        query: `INSERT INTO users_by_email (email, id, username, password_hash, name, image_url, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [email.toLowerCase(), userId, username.toLowerCase(), passwordHash, name || username, null, now, now]
      },
      // Create profile for backward compatibility
      {
        query: `INSERT INTO profiles_by_id (id, user_id, name, image_url, email, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [userId, username.toLowerCase(), name || username, null, email.toLowerCase(), now, now]
      },
      {
        query: `INSERT INTO profiles_by_user_id (user_id, id, name, image_url, email, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [username.toLowerCase(), userId, name || username, null, email.toLowerCase(), now, now]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({
      id: userId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      name: name || username,
      createdAt: now
    });
  } catch (error) {
    console.log("[REGISTER ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
