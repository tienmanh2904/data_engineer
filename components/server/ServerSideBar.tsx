import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { ChannelType, MemberRole } from "@/types/cassandra";
import { redirect } from "next/navigation";
import React from "react";
import ServerHeader from "./ServerHeader";
import { ScrollArea } from "../ui/scroll-area";
import ServerSearch from "./ServerSearch";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import { Separator } from "../ui/separator";
import ServerSection from "./ServerSection";
import ServerChannel from "./ServerChannel";
import ServerMember from "./ServerMember";

interface ServerSideBarProps {
  serverId: string;
}

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />,
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />,
};

const ServerSideBar: React.FC<ServerSideBarProps> = async ({ serverId }) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // 1. Get server basic info
  const serverResult = await db.execute(
    'SELECT * FROM servers_by_id WHERE id = ?',
    [serverId],
    { prepare: true }
  );

  if (serverResult.rows.length === 0) {
    return redirect("/");
  }

  const serverRow = serverResult.rows[0];

  // 2. Get channels
  const channelsResult = await db.execute(
    'SELECT * FROM channels_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );

  const channels = channelsResult.rows.map(row => ({
    id: row.id.toString(),
    name: row.name,
    type: row.type as ChannelType,
    serverId: row.server_id.toString(),
    profileId: row.profile_id.toString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  // 3. Get members
  const membersResult = await db.execute(
    'SELECT * FROM members_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );

  const members = membersResult.rows.map(row => ({
    id: row.id.toString(),
    role: row.role as MemberRole,
    profileId: row.profile_id.toString(),
    serverId: row.server_id.toString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      id: row.profile_id.toString(),
      userId: '', // Not available in denormalized data
      name: row.profile_name,
      imageUrl: row.profile_image_url,
      email: row.profile_email,
      createdAt: row.created_at, // Approximate
      updatedAt: row.updated_at
    }
  }));

  // 4. Construct the FULL server object with relations
  // This satisfies ServerWithMemberAndProfile and ServerWithMembersAndChannels
  const server = {
    id: serverRow.id.toString(),
    name: serverRow.name,
    imageUrl: serverRow.image_url,
    inviteCode: serverRow.invite_code,
    profileId: serverRow.profile_id.toString(),
    createdAt: serverRow.created_at,
    updatedAt: serverRow.updated_at,
    channels: channels, // <--- Attached here
    members: members    // <--- Attached here (Fixes the error)
  };

  // Filter channels for UI
  const textChannels = channels.filter(
    (channel) => channel.type === ChannelType.TEXT
  );
  const audioChannels = channels.filter(
    (channel) => channel.type === ChannelType.AUDIO
  );
  const videoChannels = channels.filter(
    (channel) => channel.type === ChannelType.VIDEO
  );
  
  // Filter members (exclude self)
  const filteredMembers = members.filter(
    (member) => profile.id !== member.profileId
  );

  // Find current user role
  const role = members.find(
    (member) => member.profileId === profile.id
  )?.role;

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2b2d31] bg-[#f2f3f5]">
      <ServerHeader server={server} role={role} />
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Text Channels",
                type: "channel",
                data: textChannels?.map((channel) => ({
                  icon: iconMap[channel.type],
                  name: channel.name,
                  id: channel.id,
                })),
              },
              {
                label: "Voice Channels",
                type: "channel",
                data: audioChannels?.map((channel) => ({
                  icon: iconMap[channel.type],
                  name: channel.name,
                  id: channel.id,
                })),
              },
              {
                label: "Video Channels",
                type: "channel",
                data: videoChannels?.map((channel) => ({
                  icon: iconMap[channel.type],
                  name: channel.name,
                  id: channel.id,
                })),
              },
              {
                label: "Members",
                type: "member",
                data: filteredMembers?.map((member) => ({
                  icon: roleIconMap[member.role],
                  name: member.profile.name,
                  id: member.id,
                })),
              },
            ]}
          />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
        {!!textChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.TEXT}
              role={role}
              label="Text Channels"
            />
            <div className="space-y-[2px]">
              {textChannels.map((channel) => {
                return (
                  <ServerChannel
                    key={channel.id}
                    role={role}
                    server={server}
                    channel={channel}
                  />
                );
              })}
            </div>
          </div>
        )}
        {!!audioChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.AUDIO}
              role={role}
              label="Voice Channels"
            />
            <div className="space-y-[2px]">
              {audioChannels.map((channel) => {
                return (
                  <ServerChannel
                    key={channel.id}
                    role={role}
                    server={server}
                    channel={channel}
                  />
                );
              })}
            </div>
          </div>
        )}
        {!!videoChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.VIDEO}
              role={role}
              label="Video Channels"
            />
            <div className="space-y-[2px]">
              {videoChannels.map((channel) => {
                return (
                  <ServerChannel
                    key={channel.id}
                    role={role}
                    server={server}
                    channel={channel}
                  />
                );
              })}
            </div>
          </div>
        )}
        {!!filteredMembers?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="members"
              role={role}
              label="Members"
              server={server}
            />
            {filteredMembers.map((member) => {
              return (
                <ServerMember key={member.id} server={server} member={member} />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ServerSideBar;