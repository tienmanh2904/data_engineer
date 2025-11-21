"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import useModal from "@/hooks/useModal";
import axios from "axios";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  imageUrl: string | null;
}

export const UserButton = () => {
  const router = useRouter();
  const { onOpen } = useModal();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("/api/auth/session");
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleAddFriend = () => {
    onOpen("addFriend");
  };

  if (isLoading || !profile) {
    return (
      <div className="h-[48px] w-[48px] rounded-full bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Avatar className="h-[48px] w-[48px] cursor-pointer hover:opacity-75 transition">
            <AvatarImage src={profile.imageUrl || undefined} />
            <AvatarFallback className="bg-indigo-500 text-white font-semibold">
              {profile.name?.[0]?.toUpperCase() || profile.userId?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        className="w-56 bg-white dark:bg-[#1e1f22] text-black dark:text-white border-zinc-200 dark:border-zinc-800"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-semibold">{profile.name}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              @{profile.userId}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleAddFriend}
          className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Friend
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/friends")}
          className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <User className="h-4 w-4 mr-2" />
          Friends
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
