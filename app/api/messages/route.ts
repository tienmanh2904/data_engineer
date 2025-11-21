import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { MessageWithMember, messageFromChannelToMessage } from "@/types/cassandra";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const MESSAGES_PER_PAGE = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");
    if (!channelId) {
      return new NextResponse("Channel ID Missing", { status: 400 });
    }

    let query = 'SELECT * FROM messages_by_channel WHERE channel_id = ?';
    const params: any[] = [channelId];

    if (cursor) {
      // Parse cursor timestamp for pagination
      const cursorDate = new Date(cursor);
      query += ' AND created_at < ?';
      params.push(cursorDate);
    }

    query += ' LIMIT ?';
    params.push(MESSAGES_PER_PAGE);

    const result = await db.execute(query, params, { prepare: true });
    
    const messages: MessageWithMember[] = result.rows.map(row => messageFromChannelToMessage(row));

    let nextCursor = null;
    if (messages.length === MESSAGES_PER_PAGE) {
      // Use timestamp as cursor for next page
      nextCursor = messages[MESSAGES_PER_PAGE - 1].createdAt.toISOString();
    }
    
    return NextResponse.json({
      item: messages,
      nextCursor,
    });

  } catch (error) {
    console.log("[MESSAGE_FETCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
