"use client";

import { Friend } from "@/types/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserMinus, MessageCircle } from "lucide-react";
import useModal from "@/hooks/useModal";
import { useRouter } from "next/navigation";

interface FriendItemProps {
  friend: Friend;
}

export const FriendItem = ({ friend }: FriendItemProps) => {
  const { onOpen } = useModal();
  const router = useRouter();

  const handleRemove = () => {
    onOpen("removeFriend", { friend });
  };

  const handleMessage = () => {
    // TODO: Navigate to DM conversation
    router.push(`/conversations/${friend.friendId}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#2b2d31] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#383a40] transition group">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={friend.friendImageUrl || undefined} />
          <AvatarFallback className="bg-indigo-500 text-white">
            {friend.friendName?.[0]?.toUpperCase() || friend.friendUsername?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {friend.friendName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            @{friend.friendUsername}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <Button
          onClick={handleMessage}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          <MessageCircle className="h-4 w-4 text-zinc-500 hover:text-indigo-500" />
        </Button>
        <Button
          onClick={handleRemove}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
        >
          <UserMinus className="h-4 w-4 text-zinc-500 hover:text-red-500" />
        </Button>
      </div>
    </div>
  );
};
