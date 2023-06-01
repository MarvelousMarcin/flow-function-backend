import express, { Express } from "express";
import cors from "cors";
import workItemRouter from "./routes/workItemRouter/workItemRouter";
const port = process.env.PORT || 8000;
import gameRouter from "./routes/gameRouter/gameRouter";
import { Server } from "socket.io";
import http from "http";

const app: Express = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

export { io };

app.set("socketio", io);
app.use(express.json());
app.use(cors());

app.use(gameRouter);
app.use(workItemRouter);

io.on("connection", (socket) => {
  socket.on("userMoved", (arg) => {
    console.log(process.env.FRONT_URL); // world
  });
});

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
