import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { Profile } from "@/types/cassandra";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
}

export const currentProfile = async (): Promise<Profile | null> => {
  try {
    // Get auth token from cookies
    const token = cookies().get("auth-token")?.value;
    
    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Get profile from database
    const result = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [decoded.userId],
      { prepare: true }
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id.toString(),
      userId: row.user_id,
      name: row.name,
      imageUrl: row.image_url,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[CURRENT_PROFILE_ERROR]', error);
    return null;
  }
};
