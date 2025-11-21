"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import axios from "axios";

interface ProfileAvatarProps {
  userId?: string;
  name?: string;
  imageUrl?: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * ProfileAvatar - A custom avatar component that can fetch user data
 * or use provided props. Replaces Clerk's user avatar functionality.
 * 
 * Usage:
 * <ProfileAvatar /> - Fetches current user
 * <ProfileAvatar userId="123" name="John" imageUrl="..." /> - Uses provided data
 */
export const ProfileAvatar = ({
  userId,
  name,
  imageUrl,
  className,
  fallbackClassName,
}: ProfileAvatarProps) => {
  const [profile, setProfile] = useState<{
    name: string;
    imageUrl: string | null;
    userId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(!userId && !name);

  useEffect(() => {
    // If props are provided, use them
    if (name || imageUrl || userId) {
      setProfile({
        name: name || "",
        imageUrl: imageUrl || null,
        userId: userId || "",
      });
      setIsLoading(false);
      return;
    }

    // Otherwise, fetch current user
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
  }, [userId, name, imageUrl]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "h-8 w-8 md:h-10 md:w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 animate-pulse",
          className
        )}
      />
    );
  }

  const displayName = profile?.name || name || "";
  const displayImage = profile?.imageUrl || imageUrl;
  const fallbackLetter = displayName[0]?.toUpperCase() || "U";

  return (
    <Avatar className={cn("h-8 w-8 md:h-10 md:w-10", className)}>
      <AvatarImage src={displayImage || undefined} />
      <AvatarFallback
        className={cn(
          "bg-indigo-500 text-white font-semibold text-xs md:text-sm",
          fallbackClassName
        )}
      >
        {fallbackLetter}
      </AvatarFallback>
    </Avatar>
  );
};
