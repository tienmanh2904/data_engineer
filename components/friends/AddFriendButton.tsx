"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import useModal from "@/hooks/useModal";

export const AddFriendButton = () => {
  const { onOpen } = useModal();

  return (
    <Button
      onClick={() => onOpen("addFriend")}
      className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg bg-indigo-500 hover:bg-indigo-600 text-white z-50"
      size="icon"
    >
      <UserPlus className="h-6 w-6" />
    </Button>
  );
};
