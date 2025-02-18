import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";

const port = 5500;
const app = express();
const server = createServer(app);

// import pool from "./db/db.js";

// pool();
app.get("/", (req, res) => {
  res.status(200).send("Zinda Hai Server ");
});
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://webrtc-khaki-nu.vercel.app",
      "http://localhost:4173",
      "https://loaclhost:3000",
    ],
    credentials: true,
  },
});
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log("Server is running on port", port);
});
