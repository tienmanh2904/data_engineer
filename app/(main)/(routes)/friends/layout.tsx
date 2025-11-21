import { currentProfile } from "@/lib/currentProfile";
import { redirect } from "next/navigation";
import React from "react";

const FriendsLayout = async ({ children }: { children: React.ReactNode }) => {
  const profile = await currentProfile();
  
  if (!profile) {
    return redirect("/sign-in");
  }

  return (
    <div className="h-full">
      {children}
    </div>
  );
};

export default FriendsLayout;
