import { db } from "./db";
import { Profile } from "@/types/cassandra";
import { redirect } from "next/navigation";
import { currentProfile } from "./currentProfile";

const initialProfile = async (): Promise<Profile> => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }
  
  // Profile already exists from registration/login
  // This function now just ensures user is authenticated
  return profile;
};

export default initialProfile;
