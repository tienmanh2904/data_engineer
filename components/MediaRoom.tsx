"use client";
import React, { use, useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  useStartAudio,
} from "@livekit/components-react";
import { Channel } from "@/types/cassandra";
import { Loader2 } from "lucide-react";
import axios from "axios";

import '@livekit/components-styles';

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
}

const MediaRoom: React.FC<MediaRoomProps> = ({ chatId, video, audio }) => {
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/auth/session");
        setUserName(response.data.name || response.data.userId);
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userName) return;

    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${chatId}&username=${userName}`
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [userName, chatId]);

  if (token === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }
  return (
    <LiveKitRoom
      data-lk-theme="default"
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      video={video}
      audio={audio}
    >
      <VideoConference />
    </LiveKitRoom>
  );
};

export default MediaRoom;
