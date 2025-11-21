"use client";

import { FriendRequestWithUser } from "@/types/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FriendRequestItemProps {
  request: FriendRequestWithUser;
  type: "sent" | "received";
}

export const FriendRequestItem = ({ request, type }: FriendRequestItemProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const displayName = type === "sent" 
    ? request.receiverName || request.receiverUsername
    : request.senderName || request.senderUsername;
    
  const displayUsername = type === "sent"
    ? request.receiverUsername
    : request.senderUsername;
    
  const displayImage = type === "sent"
    ? request.receiverImageUrl
    : request.senderImageUrl;

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/friends/requests/${request.id}`, {
        action: "accept"
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/friends/requests/${request.id}`, {
        action: "reject"
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      await axios.delete(`/api/friends/requests/${request.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#2b2d31] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#383a40] transition">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={displayImage || undefined} />
          <AvatarFallback className="bg-amber-500 text-white">
            {displayName?.[0]?.toUpperCase() || displayUsername?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {displayName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            @{displayUsername}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {type === "received" ? (
          <>
            <Button
              onClick={handleAccept}
              disabled={isLoading}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading}
              size="sm"
              variant="destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
