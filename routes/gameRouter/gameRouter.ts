import express from "express";
import { prisma } from "../../prisma/client";
const gameRouter = express.Router();
const tables = ["Strategic Value", "Design", "Development", "Release"];
import { IO } from "../../types/socket";
import { getWorkItems } from "../workItemRouter/getWorkItems";

function getRandomGameCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

function generateRandomHexColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";

  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
}

gameRouter.get("/initSimulation", async (req, res) => {
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

  return res.status(200).json({ gameCode: newGameCode });
});

gameRouter.post("/joinSimulation", async (req, res) => {
  const body = await req.body;

  const name = body.name;
  const key = body.gameKey;

  const game = await prisma.game.findUnique({ where: { code: key } });

  if (!game) {
    return res.status(401).json({ msg: "No game with such key" });
  }

  const findUser = await prisma.user.findMany({
    where: { gameKey: key, name },
  });

  console.log(game.day);
  console.log(findUser);

  if (game.day > 1 && findUser.length === 0) {
    return res.status(401).json({ msg: "Game has already started" });
  }

  const activeDay = await prisma.game.findUnique({ where: { code: key } });

  function generateRandomNumber(): number {
    return Math.floor(Math.random() * 4);
  }

  const io: IO = req.app.get("socketio");

  if (findUser.length !== 0) {
    const howManyPlayers = await prisma.user.aggregate({
      _count: { id: true },
      where: { gameKey: key },
    });

    const players = await prisma.user.findMany({ where: { gameKey: key } });

    return res.status(200).json({
      ...findUser[0],
      activeDay,
      howManyPlayers: howManyPlayers._count.id,
      players,
    });
  } else {
    const table = ["Strategic Value", "Development", "Release", "Design"];
    const newUser = await prisma.user.create({
      data: {
        name: name,
        gameKey: key,
        color: generateRandomHexColor(),
        table: table[generateRandomNumber()],
      },
    });

    // move one work item for new user
    const workItemToMove = await prisma.workItem.findFirst({
      where: { stage: 1, table: newUser.table, game_id: key },
    });
    await prisma.workItem.update({
      where: { id: workItemToMove?.id },
      data: { stage: 2, ownerId: newUser.id, start: 1 },
    });

    // TODO: Optimise
    const howManyPlayers = await prisma.user.aggregate({
      _count: { id: true },
      where: { gameKey: key },
    });

    const players = await prisma.user.findMany({ where: { gameKey: key } });

    const workItems = await getWorkItems(key as string);
    io.emit("rerenderWorkItems", { workItems });

    io.emit("userJoined", {
      howManyPlayers: howManyPlayers._count.id,
      players,
    });

    return res.status(200).json({
      ...newUser,
      activeDay,
      howManyPlayers: howManyPlayers._count.id,
      players,
    });
  }
});

export default gameRouter;
