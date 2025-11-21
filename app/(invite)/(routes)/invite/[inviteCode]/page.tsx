import InviteBox from "@/components/InviteBox";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import React from "react";
import { types } from "cassandra-driver";

interface InvitePageProps {
  params: {
    inviteCode: string;
  };
}

const Page: React.FC<InvitePageProps> = async ({ params }) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  if (!params.inviteCode) {
    return redirect("/");
  }

  // 1. Find Server by Invite Code
  // Schema: servers_by_invite_code
  const inviteQuery = `
    SELECT server_id, server_name, server_image_url 
    FROM servers_by_invite_code 
    WHERE invite_code = ?
  `;
  const inviteResult = await db.execute(inviteQuery, [params.inviteCode], { prepare: true });
  const inviteRow = inviteResult.first();

  if (!inviteRow) {
    return redirect("/");
  }

  const serverId = inviteRow.get("server_id"); // This is a Uuid object
  const serverName = inviteRow.get("server_name");
  const serverImage = inviteRow.get("server_image_url");

  // 2. Check if user is ALREADY a member
  // Schema: members_by_profile_and_server
  const membershipQuery = `
    SELECT id FROM members_by_profile_and_server 
    WHERE profile_id = ? AND server_id = ?
  `;
  const membershipResult = await db.execute(membershipQuery, [profile.id, serverId], { prepare: true });

  if (membershipResult.rowLength > 0) {
    return redirect(`/servers/${serverId}`);
  }

  // 3. Fetch Server Owner Details (Required for the Invite UI)
  // We need to get the owner's profile_id from the main server table first
  const serverDetailsQuery = `SELECT profile_id FROM servers_by_id WHERE id = ?`;
  const serverDetailsResult = await db.execute(serverDetailsQuery, [serverId], { prepare: true });
  const serverOwnerRow = serverDetailsResult.first();

  let ownerProfile = null;

  if (serverOwnerRow) {
    const ownerId = serverOwnerRow.get("profile_id");
    const ownerQuery = `SELECT name, image_url, email FROM profiles_by_id WHERE id = ?`;
    const ownerResult = await db.execute(ownerQuery, [ownerId], { prepare: true });
    const ownerData = ownerResult.first();
    
    if (ownerData) {
      ownerProfile = {
        name: ownerData.get("name"),
        imageUrl: ownerData.get("image_url"),
        email: ownerData.get("email"),
        // We convert IDs to string for the UI component if needed
        id: ownerId.toString() 
      };
    }
  }

  // Prepare data for the client component
  const serverData = {
    inviteCode: params.inviteCode,
    name: serverName,
    imageUrl: serverImage,
    profile: ownerProfile,
  };

  // 4. Server Action to Join
  const handleClicked = async () => {
    "use server";
    try {
      const newMemberId = types.Uuid.random();
      const now = new Date();
      const role = "GUEST";

      // We use a BATCH to update all denormalized tables simultaneously
      const queries = [
        {
          // Main member record
          query: `INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          params: [newMemberId, role, profile.id, serverId, now, now]
        },
        {
          // List members in this server
          query: `INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [serverId, role, newMemberId, profile.id, profile.name, profile.imageUrl, profile.email, now, now]
        },
        {
          // Lookup table to check membership later
          query: `INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          params: [profile.id, serverId, newMemberId, role, now, now]
        },
        {
          // Add this server to the user's sidebar list
          query: `INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) VALUES (?, ?, ?, ?, ?, ?)`,
          params: [profile.id, serverId, serverName, serverImage, role, now]
        }
      ];

      await db.batch(queries, { prepare: true });
      
    } catch (error) {
      console.log("[INVITE_JOIN_ERROR]", error);
      throw error; 
    }
    
    // Redirect must happen outside the try-catch if it's a Next.js redirect,
    // or be the final return. Here we do it after successful batch.
    return redirect(`/servers/${serverId}`);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-[url('/Background.png')] bg-cover bg-center bg-no-repeat">
      <InviteBox serverData={serverData} onClick={handleClicked} />
    </div>
  );
};

export default Page;