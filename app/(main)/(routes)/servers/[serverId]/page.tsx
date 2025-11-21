import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

interface PageProps {
  params: {
    serverId: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const profile = await currentProfile();
  if (!profile) return redirectToSignIn();
  
  // Verify user is member of this server
  const memberResult = await db.execute(
    'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
    [profile.id, params.serverId],
    { prepare: true }
  );
  
  if (memberResult.rows.length === 0) {
    return redirect("/");
  }
  
  // Get the general channel
  const channelsResult = await db.execute(
    'SELECT * FROM channels_by_server WHERE server_id = ? AND name = ? LIMIT 1',
    [params.serverId, 'general'],
    { prepare: true }
  );
  
  const initialChannel = channelsResult.rows[0];
  
  if (!initialChannel || initialChannel.name !== "general") return null;

  return redirect(`/servers/${params.serverId}/channels/${initialChannel.id}`);
};

export default Page;
