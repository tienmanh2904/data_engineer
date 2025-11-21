import { db } from "./db";
import { NextApiRequest } from "next";
import { Profile } from "@/types/cassandra";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export const currentProfilePages = async (req: NextApiRequest): Promise<Profile | null> => {
  const token = req.cookies["auth-token"];
  if (!token) {
    return null;
  }
  
  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch (error) {
    return null;
  }
  
  try {
    const result = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [userId],
      { prepare: true }
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      imageUrl: row.image_url,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[CURRENT_PROFILE_PAGES_ERROR]', error);
    return null;
  }
};
