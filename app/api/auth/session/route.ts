import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.log("[SESSION ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
