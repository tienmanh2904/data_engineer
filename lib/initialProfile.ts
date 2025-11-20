import { currentUser, redirectToSignIn } from "@clerk/nextjs";
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Profile } from "@/types/cassandra";

const initialProfile = async (): Promise<Profile> => {
  const user = await currentUser();
  if (!user) {
    return redirectToSignIn();
  }
  
  try {
    // Check if profile exists
    const result = await db.execute(
      'SELECT * FROM profiles_by_user_id WHERE user_id = ?',
      [user.id],
      { prepare: true }
    );
    
    if (result.rows.length > 0) {
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
    }
    
    // Create new profile
    const profileId = uuidv4();
    const now = new Date();
    const name = `${user.firstName} ${user.lastName}`;
    const imageUrl = user.imageUrl;
    const email = user.emailAddresses[0].emailAddress;
    
    const queries = [
      {
        query: 'INSERT INTO profiles_by_id (id, user_id, name, image_url, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [profileId, user.id, name, imageUrl, email, now, now]
      },
      {
        query: 'INSERT INTO profiles_by_user_id (user_id, id, name, image_url, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [user.id, profileId, name, imageUrl, email, now, now]
      }
    ];
    
    await db.batch(queries, { prepare: true });
    
    return {
      id: profileId,
      userId: user.id,
      name,
      imageUrl,
      email,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('[INITIAL_PROFILE_ERROR]', error);
    throw error;
  }
};

export default initialProfile;
