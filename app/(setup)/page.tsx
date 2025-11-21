import React from "react";
import { redirect } from "next/navigation";
import initialProfile from "@/lib/initialProfile";
import { db } from "@/lib/db";
import InitialModal from "@/components/modals/InitialModal";
export const dynamic = "force-dynamic";
const Page = async () => {
  const profile = await initialProfile();
  
  // Get servers for this profile
  const serversResult = await db.execute(
    'SELECT * FROM servers_by_profile WHERE profile_id = ? LIMIT 1',
    [profile.id],
    { prepare: true }
  );
  
  if (serversResult.rows.length > 0) {
    const server = serversResult.rows[0];
    return redirect(`/servers/${server.server_id}`);
  }
  
  return (
    <div className="h-full w-full flex justify-center items-center bg-[url('/Background.png')] bg-no-repeat bg-cover bg-center">
      <InitialModal />
    </div>
  );
};

export default Page;
