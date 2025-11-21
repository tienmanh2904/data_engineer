import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRES_IN = "7d";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Validate input
    if (!username || !password) {
      return new NextResponse("Missing username or password", { status: 400 });
    }

    // Get user by username
    const userResult = await db.execute(
      'SELECT * FROM users_by_username WHERE username = ?',
      [username.toLowerCase()],
      { prepare: true }
    );

    if (userResult.rows.length === 0) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id.toString(),
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTP-only cookie
    cookies().set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      imageUrl: user.image_url
    });
  } catch (error) {
    console.log("[LOGIN ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
