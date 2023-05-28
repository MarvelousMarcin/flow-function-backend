import express, { Express, Request, Response } from "express";
import { prisma } from "./prisma/client";
const port = 8000;
import gameRouter from "./routes/gameRouter/gameRouter";
const app: Express = express();
app.use(express.json());

app.get("/", async (req: Request, res: Response) => {
  res.send("hello from express");
});

app.use(gameRouter);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
