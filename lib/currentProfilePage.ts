import { getAuth } from "@clerk/nextjs/server";
import { db } from "./db";
import { NextApiRequest } from "next";
import { Profile } from "@/types/cassandra";

export const currentProfilePages = async (req: NextApiRequest): Promise<Profile | null> => {
  const { userId } = getAuth(req);
  if (!userId) {
    return null;
  }
  
  try {
    const result = await db.execute(
      'SELECT * FROM profiles_by_user_id WHERE user_id = ?',
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
