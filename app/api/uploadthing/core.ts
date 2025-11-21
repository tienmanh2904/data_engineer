import { createUploadthing, type FileRouter } from "uploadthing/next";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const f = createUploadthing();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

const handleAuth = () => {
  const token = cookies().get("auth-token")?.value;
  if (!token) throw new Error("Unauthorized");
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: decoded.userId };
  } catch (error) {
    throw new Error("Unauthorized");
  }
};

export const ourFileRouter = {
  serverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

  messageFile: f(["image", "pdf"])
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;