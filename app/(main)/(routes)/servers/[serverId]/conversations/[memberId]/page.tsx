import MediaRoom from "@/components/MediaRoom";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessages from "@/components/chat/ChatMessages";
import { getOrCreateConversation } from "@/lib/conversation";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import React from "react";

interface PageProps {
  params: {
    serverId: string;
    memberId: string;
  };
  searchParams: {
    video?: boolean;
  };
}

const Page = async ({ params, searchParams }: PageProps) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }
  
  // Get current member
  const currentMemberResult = await db.execute(
    'SELECT * FROM members_by_profile_and_server WHERE server_id = ? AND profile_id = ?',
    [params.serverId, profile.id],
    { prepare: true }
  );
  
  if (currentMemberResult.rows.length === 0) {
    return redirect("/");
  }
  
  const currentMemberRow = currentMemberResult.rows[0];
  const currentMember = {
    id: currentMemberRow.id,
    role: currentMemberRow.role,
    profileId: currentMemberRow.profile_id,
    serverId: currentMemberRow.server_id,
    createdAt: currentMemberRow.created_at,
    updatedAt: currentMemberRow.updated_at,
    profile: {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      imageUrl: profile.imageUrl,
      email: profile.email,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }
  };
  
  const conversation = await getOrCreateConversation(
    currentMember.id,
    params.memberId
  );
  
  if (!conversation) {
    return redirect(`/servers/${params.serverId}`);
  }
  
  const { memberOne, memberTwo } = conversation;
  const otherMember =
    memberOne.profileId === profile.id ? memberTwo : memberOne;

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        imageUrl={otherMember.profile.imageUrl}
        name={otherMember.profile.name}
        serverId={params.serverId}
        type="conversation"
      />
      {searchParams.video && (
        <MediaRoom chatId={conversation.id} video={true} audio={true} />
      )}
      {!searchParams.video && (
        <>
          <ChatMessages
            member={currentMember}
            name={otherMember.profile.name}
            chatId={conversation.id}
            type="conversation"
            apiUrl="/api/direct-messages"
            paramKey="conversationId"
            paramValue={conversation.id}
            socketQuery={{ conversationId: conversation.id }}
            socketUrl="/api/socket/direct-messages"
          />
          <ChatInput
            name={otherMember.profile.name}
            type="conversation"
            apiUrl="/api/socket/direct-messages"
            query={{
              conversationId: conversation.id,
            }}
          />
        </>
      )}
    </div>
  );
};

export default Page;
