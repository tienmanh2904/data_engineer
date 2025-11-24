import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // Clear the auth token cookie
    cookies().set("auth-token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0
    });

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("[LOGOUT ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
