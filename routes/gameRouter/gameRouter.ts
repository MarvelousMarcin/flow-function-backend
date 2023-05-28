import express from "express";
import { prisma } from "../../prisma/client";
const gameRouter = express.Router();

const tables = ["Strategic Value", "Design", "Development", "Release"];

function getRandomGameCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

gameRouter.post("/initSimulation", async (req, res) => {
  let newGameCode = getRandomGameCode();

  const findGame = await prisma.game.findUnique({
    where: { code: newGameCode },
  });
  if (findGame) {
    newGameCode = getRandomGameCode();
  }

  const newGame = await prisma.game.create({ data: { code: newGameCode } });

  const workItems = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 20; j++) {
      const item = {
        blocker: 0,
        game_id: newGame.code,
        table: tables[i],
        start: 0,
        stage: 1,
      };
      workItems.push(item);
    }
  }

  await prisma.workItem.createMany({ data: workItems });

  return res.status(200).json({ data: workItems });
});

export default gameRouter;
