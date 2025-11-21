import ServerSideBar from "@/components/server/ServerSideBar";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import React from "react";

const ServerLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { serverId: string };
}) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }
  
  // Verify user is member of this server
  const memberResult = await db.execute(
    'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
    [profile.id, params.serverId],
    { prepare: true }
  );
  
  if (memberResult.rows.length === 0) {
    return redirect("/");
  }
  
  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0">
        <ServerSideBar serverId={params.serverId}/>
      </div>
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
};

export default ServerLayout;
