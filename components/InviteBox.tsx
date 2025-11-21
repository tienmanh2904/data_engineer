"use client";

import Image from "next/image";
import React, { useTransition } from "react";
import { Loader2 } from "lucide-react"; // Assuming you have lucide-react, otherwise use text

interface InviteBoxProps {
  serverData: {
    name: string;
    imageUrl: string;
    profile: {
      name: string;
    } | null;
  };
  onClick: () => Promise<void> | void;
}

const InviteBox = ({ serverData, onClick }: InviteBoxProps) => {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    // startTransition allows us to track the pending state of the Server Action
    startTransition(async () => {
      await onClick();
    });
  };

  return (
    <div className="w-full sm:w-[500px] p-5 flex flex-col items-center bg-[#232323] gap-3 rounded-sm shadow-md">
      {serverData.imageUrl && (
        <div className="relative h-[70px] w-[70px]">
            <Image
            src={serverData.imageUrl}
            alt={serverData.name}
            fill
            className="object-cover rounded-2xl"
            />
        </div>
      )}
      
      <p className="text-base text-neutral-400 capitalize text-center">
        {serverData.profile?.name 
          ? <span className="font-semibold text-zinc-300">{serverData.profile.name}</span> 
          : "Someone"
        } 
        {" "}invited you to join the Server
      </p>
      
      <p className="text-2xl mb-3 font-bold text-white">{serverData.name}</p>
      
      <button
        disabled={isPending}
        onClick={handleAccept}
        className={`
            w-full p-2.5 text-lg rounded-sm transition-all flex items-center justify-center gap-x-2
            ${isPending 
                ? "bg-indigo-500/50 cursor-not-allowed text-zinc-300" 
                : "bg-indigo-500 hover:bg-indigo-500/90 text-white"
            }
        `}
      >
        {isPending ? (
            <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Joining...
            </>
        ) : (
            "Accept Invite"
        )}
      </button>
    </div>
  );
};

export default InviteBox;