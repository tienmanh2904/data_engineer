"use client";

import React from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import useModal from "@/hooks/useModal";
import { UserMinus } from "lucide-react";

const RemoveFriendModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "removeFriend";
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const { friend } = data;

  const onConfirm = async () => {
    if (!friend) return;
    
    try {
      setIsLoading(true);
      await axios.delete(`/api/friends/${friend.friendId}`);
      onClose();
      router.refresh();
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-black dark:text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-2">
            <UserMinus className="h-6 w-6 text-red-500" />
            Remove Friend
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-indigo-500">
              {friend?.friendName || friend?.friendUsername}
            </span>{" "}
            from your friends list?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-gray-100 dark:bg-[#383338] px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button disabled={isLoading} onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={onConfirm} variant="destructive">
              Remove Friend
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveFriendModal;
