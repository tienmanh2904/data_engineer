import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "@/types/ServerType";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket) {
    return res.end();
  }

  const httpServer: NetServer & { io?: ServerIO } = res.socket.server as any;

  if (!httpServer.io) {
    const path = "/api/socket/io";
    const io = new ServerIO(httpServer, {
      path: path,
      addTrailingSlash: false,
    });
    httpServer.io = io;
  }
  res.end();
};

export default ioHandler;
