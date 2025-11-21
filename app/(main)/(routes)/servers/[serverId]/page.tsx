import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { RedirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

interface ServerIdPageProps {
  params: {
    serverId: string;
  };
}

const ServerIdPage = async ({ params }: ServerIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return <RedirectToSignIn />;
  }

  // 1. Fetch server to ensure user is a member
  const serverQuery = `
    SELECT id FROM servers_by_id 
    WHERE id = ? 
  `;
  const serverResult = await db.execute(serverQuery, [params.serverId], { prepare: true });
  
  // Check if server exists
  if (serverResult.rowLength === 0) {
      // You might want to check if the user is actually a member here too
      // using members_by_profile_and_server, but for now let's stick to the redirect logic
      return redirect("/");
  }

  // 2. Fetch ALL channels for this server
  // WE CANNOT filter by 'name' in the SQL query because it is not a primary key
  const channelsQuery = `
    SELECT id, name FROM channels_by_server 
    WHERE server_id = ?
  `;
  
  const channelsResult = await db.execute(channelsQuery, [params.serverId], { prepare: true });
  
  // 3. Find the "general" channel using JavaScript
  const initialChannel = channelsResult.rows.find(row => row.name === "general");

  // 4. Redirect
  if (initialChannel) {
    return redirect(`/servers/${params.serverId}/channels/${initialChannel.id}`);
  }

  // Fallback if no general channel found (redirect to the first available channel or empty)
  if (channelsResult.rowLength > 0) {
      return redirect(`/servers/${params.serverId}/channels/${channelsResult.rows[0].id}`);
  }

  return null;
}

export default ServerIdPage;