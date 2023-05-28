import express, { Express, Request, Response } from "express";
import cors from "cors";
import workItemRouter from "./routes/workItemRouter/workItemRouter";
const port = 8000;
import gameRouter from "./routes/gameRouter/gameRouter";
const app: Express = express();
app.use(express.json());
app.use(cors());

app.use(gameRouter);
app.use(workItemRouter);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
