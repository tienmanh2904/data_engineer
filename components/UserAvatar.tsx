import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ src, name, className }) => {
  // Get the first letter of the name for fallback
  const fallbackLetter = name?.[0]?.toUpperCase() || "U";

  return (
    <Avatar className={cn("flex justify-center items-center", className)}>
      <AvatarImage
        src={src}
        className={cn("h-7 w-7 md:h-10 md:w-10")}
      />
      <AvatarFallback className="bg-indigo-500 text-white font-semibold text-xs md:text-sm">
        {fallbackLetter}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
