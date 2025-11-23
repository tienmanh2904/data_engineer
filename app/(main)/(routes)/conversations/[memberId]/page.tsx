import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/currentProfile";
import { getOrCreateProfileConversation } from "@/lib/conversation"; // Import the NEW function
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import MediaRoom from "@/components/MediaRoom";
import { MemberRole } from "@/types/cassandra";

interface ConversationPageProps {
  params: {
    memberId: string; // This is the Friend's PROFILE ID
  };
  searchParams: {
    video?: boolean;
  };
}

const ConversationPage = async ({
  params,
  searchParams,
}: ConversationPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Use the NEW function to get conversation by PROFILE IDs
  const conversation = await getOrCreateProfileConversation(
    profile.id,
    params.memberId
  );

  if (!conversation) {
    return redirect("/");
  }

  const { memberOne, memberTwo } = conversation;
  // Determine who is the "other" person
  const otherMember = memberOne.profileId === profile.id ? memberTwo : memberOne;

  // Create a "Synthetic" Member object for the current user
  // This satisfies the ChatMessages interface without needing a real Server Member
  const currentMemberMock = {
    id: profile.id, // We use Profile ID as Member ID
    serverId: "direct-message", // Placeholder
    profileId: profile.id,
    role: "GUEST" as MemberRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (searchParams.video) {
    return (
      <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
        <ChatHeader
          imageUrl={otherMember.profile.image_url || otherMember.profile.imageUrl}
          name={otherMember.profile.name}
          serverId="direct-message"
          type="conversation"
        />
        <MediaRoom chatId={conversation.id.toString()} video={true} audio={true} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        imageUrl={otherMember.profile.image_url || otherMember.profile.imageUrl}
        name={otherMember.profile.name}
        serverId="direct-message"
        type="conversation"
      />
      <ChatMessages
        member={currentMemberMock}
        name={otherMember.profile.name}
        chatId={conversation.id.toString()}
        type="conversation"
        apiUrl="/api/direct-messages"
        paramKey="conversationId"
        paramValue={conversation.id.toString()}
        socketUrl="/api/socket/direct-messages"
        socketQuery={{
          conversationId: conversation.id.toString(),
        }}
      />
      <ChatInput
        name={otherMember.profile.name}
        type="conversation"
        apiUrl="/api/socket/direct-messages"
        query={{
          conversationId: conversation.id.toString(),
        }}
      />
    </div>
  );
};

export default ConversationPage;