import express, { Express, Request, Response } from "express";

const port = 8000;

const app: Express = express();

app.get("/", (req: Request, res: Response) => {
  res.send("hello from express");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
