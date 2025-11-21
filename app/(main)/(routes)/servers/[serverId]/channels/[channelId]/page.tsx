import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import React from "react";
import { redirect } from "next/navigation";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessages from "@/components/chat/ChatMessages";
import { ChannelType } from "@/types/cassandra";
import MediaRoom from "@/components/MediaRoom";

interface PageProps {
  params: {
    serverId: string;
    channelId: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const profile = await currentProfile();
  if (!profile) return redirect("/sign-in");
  
  // Get channel
  const channelResult = await db.execute(
    'SELECT * FROM channels_by_id WHERE id = ?',
    [params.channelId],
    { prepare: true }
  );
  
  if (channelResult.rows.length === 0) {
    return redirect("/");
  }
  
  const channelRow = channelResult.rows[0];
  const channel = {
    id: channelRow.id,
    name: channelRow.name,
    type: channelRow.type as ChannelType,
    serverId: channelRow.server_id,
    profileId: channelRow.profile_id,
    createdAt: channelRow.created_at,
    updatedAt: channelRow.updated_at
  };
  
  // Get member
  const memberResult = await db.execute(
    'SELECT * FROM members_by_profile_and_server WHERE server_id = ? AND profile_id = ?',
    [params.serverId, profile.id],
    { prepare: true }
  );
  
  if (memberResult.rows.length === 0) {
    return redirect("/");
  }
  
  const memberRow = memberResult.rows[0];
  const member = {
    id: memberRow.id,
    role: memberRow.role,
    profileId: memberRow.profile_id,
    serverId: memberRow.server_id,
    createdAt: memberRow.created_at,
    updatedAt: memberRow.updated_at
  };
  
  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
      />
      {channel.type === ChannelType.TEXT && (
        <>
          <ChatMessages
            member={member}
            name={channel.name}
            type="channel"
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            paramKey="channelId"
            chatId={channel.id}
            paramValue={channel.id}
          />
          <ChatInput
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{ serverId: channel.serverId, channelId: channel.id }}
          />
        </>
      )}
      {channel.type === ChannelType.AUDIO && (
        <MediaRoom chatId={channel.id} video={false} audio={true} />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom chatId={channel.id} video={true} audio={true} />
      )}
    </div>
  );
};

export default Page;
