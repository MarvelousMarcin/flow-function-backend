import express, { Express, Request, Response } from "express";
import { prisma } from "./prisma/client";
const port = 8000;

const app: Express = express();

app.get("/", async (req: Request, res: Response) => {
  res.send("hello from express");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
