import { currentProfile } from "@/lib/currentProfile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Friend, FriendRequestWithUser } from "@/types/friends";
import { Users, UserPlus, Inbox } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FriendItem } from "@/components/friends/FriendItem";
import { FriendRequestItem } from "@/components/friends/FriendRequestItem";
import { AddFriendButton } from "@/components/friends/AddFriendButton";
import Link from "next/link";
export const dynamic = "force-dynamic";
interface FriendsPageProps {
  searchParams: {
    tab?: string;
  };
}

const FriendsPage = async ({ searchParams }: FriendsPageProps) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }

  const activeTab = searchParams.tab || "all";

  // Fetch friends
  const friendsResult = await db.execute(
    'SELECT * FROM friends_by_user WHERE user_id = ?',
    [profile.id],
    { prepare: true }
  );

  const friends: Friend[] = friendsResult.rows.map(row => ({
    userId: row.user_id.toString(),
    friendId: row.friend_id.toString(),
    friendUsername: row.friend_username,
    friendName: row.friend_name,
    friendImageUrl: row.friend_image_url,
    friendEmail: row.friend_email,
    becameFriendsAt: row.became_friends_at,
  }));

  // Fetch received friend requests
  const receivedRequestsResult = await db.execute(
    'SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?',
    [profile.id],
    { prepare: true }
  );

  const receivedRequests: FriendRequestWithUser[] = receivedRequestsResult.rows
    .filter(row => row.status === 'PENDING')
    .map(row => ({
      id: row.id.toString(),
      senderId: row.sender_id.toString(),
      receiverId: profile.id,
      senderUsername: row.sender_username,
      senderName: row.sender_name,
      senderImageUrl: row.sender_image_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  // Fetch sent friend requests
  const sentRequestsResult = await db.execute(
    'SELECT * FROM friend_requests_by_sender WHERE sender_id = ?',
    [profile.id],
    { prepare: true }
  );

  const sentRequests: FriendRequestWithUser[] = sentRequestsResult.rows
    .filter(row => row.status === 'PENDING')
    .map(row => ({
      id: row.id.toString(),
      senderId: profile.id,
      receiverId: row.receiver_id.toString(),
      receiverUsername: row.receiver_username,
      receiverName: row.receiver_name,
      receiverImageUrl: row.receiver_image_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#313338]">
      {/* Header */}
      <div className="flex items-center h-12 px-4 border-b-2 border-neutral-200 dark:border-neutral-800">
        <Users className="h-5 w-5 text-zinc-500 dark:text-zinc-400 mr-2" />
        <p className="font-semibold text-md text-black dark:text-white">
          Friends
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/friends?tab=all">
          <Button
            variant={activeTab === "all" ? "primary" : "ghost"}
            size="sm"
            className="font-semibold"
          >
            All Friends
            {friends.length > 0 && (
              <span className="ml-1 text-xs">({friends.length})</span>
            )}
          </Button>
        </Link>
        <Link href="/friends?tab=pending">
          <Button
            variant={activeTab === "pending" ? "primary" : "ghost"}
            size="sm"
            className="font-semibold"
          >
            Pending
            {receivedRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {receivedRequests.length}
              </span>
            )}
          </Button>
        </Link>
        <Link href="/friends?tab=sent">
          <Button
            variant={activeTab === "sent" ? "primary" : "ghost"}
            size="sm"
            className="font-semibold"
          >
            Sent Requests
            {sentRequests.length > 0 && (
              <span className="ml-1 text-xs">({sentRequests.length})</span>
            )}
          </Button>
        </Link>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 py-4">
        {activeTab === "all" && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  No friends yet
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  Start adding friends to see them here!
                </p>
              </div>
            ) : (
              friends.map((friend) => (
                <FriendItem key={friend.friendId} friend={friend} />
              ))
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-3">
            {receivedRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Inbox className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  No pending requests
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  When someone sends you a friend request, it will appear here.
                </p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <FriendRequestItem
                  key={request.id}
                  request={request}
                  type="received"
                />
              ))
            )}
          </div>
        )}

        {activeTab === "sent" && (
          <div className="space-y-3">
            {sentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserPlus className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  No sent requests
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  Send friend requests to connect with others!
                </p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <FriendRequestItem
                  key={request.id}
                  request={request}
                  type="sent"
                />
              ))
            )}
          </div>
        )}
      </ScrollArea>
      
      {/* Floating Action Button */}
      <AddFriendButton />
    </div>
  );
};

export default FriendsPage;
