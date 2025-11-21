import { currentProfile } from "@/lib/currentProfile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import React from "react";
import NavigationAction from "./NavigationAction";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import NavigationItem from "./NavigationItem";
import { ModeToggle } from "../ToggleTheme";
import { UserButton } from "@/components/UserButton";
import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NavigationSidebar = async () => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }
  
  // Get all servers for this profile
  const serversResult = await db.execute(
    'SELECT * FROM servers_by_profile WHERE profile_id = ?',
    [profile.id],
    { prepare: true }
  );
  
  const servers = serversResult.rows.map(row => ({
    id: row.server_id,
    name: row.server_name,
    imageUrl: row.server_image_url
  }));

  // Get pending friend requests count
  const pendingRequestsResult = await db.execute(
    'SELECT COUNT(*) as count FROM friend_requests_by_receiver WHERE receiver_id = ?',
    [profile.id],
    { prepare: true }
  );

  const pendingCount = pendingRequestsResult.rows[0]?.count || 0;
  
  return (
    <div className="space-y-4 flex flex-col items-center h-full text-primary w-full bg-[#e3e5e8] dark:bg-[#1e1f22] py-3">
      <Link href="/friends">
        <Button
          variant="ghost"
          className="group flex items-center justify-center h-[48px] w-[48px] rounded-[24px] hover:rounded-[16px] transition-all overflow-hidden bg-background dark:bg-neutral-700 hover:bg-indigo-500 relative"
        >
          <Users className="group-hover:text-white transition text-indigo-500" size={25} />
          {pendingCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </Link>
      <NavigationAction />
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {servers.map((server) => {
          return (
            <div key={server.id} className="mb-4">
              <NavigationItem
                name={server.name}
                id={server.id}
                imageUrl={server.imageUrl}
              />
            </div>
          );
        })}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        <UserButton />
      </div>
    </div>
  );
};

export default NavigationSidebar;
