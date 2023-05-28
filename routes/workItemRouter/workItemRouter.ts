import express from "express";
import { prisma } from "../../prisma/client";
const workItemRouter = express.Router();

workItemRouter.post("/blockWorkItem", async (req, res) => {
  const body = await req.body;
  const workItemId = body.workItemId;
  const userId = body.userId;

  const findWorkItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { owner: { include: { game: true } } },
  });

  const activeDat = Number(findWorkItem?.owner?.game?.day);
  const userMoves = findWorkItem?.owner?.moves as number;
  const gameKey = findWorkItem?.game_id;

  if (Number(activeDat) === Number(userMoves)) {
    return res.status(200).json({ msg: "You have already made your move" });
  }

  if (findWorkItem && findWorkItem.stage !== 1 && findWorkItem.stage !== 4) {
    // User move + 1
    await prisma.user.update({
      where: { id: userId },
      data: { moves: userMoves + 1 },
    });

    await prisma.workItem.update({
      where: { id: workItemId },
      data: { blocker: findWorkItem.blocker + 1 },
    });
    const moveNewItem = await prisma.workItem.findFirst({
      where: { stage: 1, table: findWorkItem.table, game_id: gameKey },
    });
    if (moveNewItem) {
      await prisma.workItem.update({
        where: { id: moveNewItem?.id },
        data: { stage: moveNewItem?.stage + 1, ownerId: userId },
      });
    }
    const ifAllUsersMoved = await prisma.user.findMany({
      where: { NOT: { moves: activeDat }, gameKey },
    });

    if (ifAllUsersMoved.length === 0) {
      await prisma.game.update({
        where: { code: gameKey },
        data: { day: activeDat + 1 },
      });
      return res.status(200).json({ nextDay: true });
    } else {
      return res.status(200).json({ nextDay: false });
    }
  }

  return res.status(200).json({});
});

workItemRouter.post("/moveWorkItem", async (req, res) => {
  const body = await req.body;
  const workItemId = body.workItemId;
  const userId = body.userId;

  const findWorkItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { owner: { include: { game: true } } },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { game: true },
  });

  const activeDat = Number(user?.game?.day);
  const userMoves = user?.moves as number;
  const gameKey = findWorkItem?.game_id;

  if (Number(activeDat) === Number(userMoves)) {
    return res.status(200).json({ msg: "You have already made your move" });
  }
  if (findWorkItem) {
    // User move + 1
    await prisma.user.update({
      where: { id: userId },
      data: { moves: userMoves + 1 },
    });

    // Check if Item has Blocker
    if (findWorkItem.blocker > 0) {
      await prisma.workItem.update({
        where: { id: workItemId },
        data: { blocker: findWorkItem.blocker - 1 },
      });
    } else {
      if (findWorkItem.stage === 1) {
        await prisma.workItem.update({
          where: { id: workItemId },
          data: {
            stage: findWorkItem.stage + 1,
            ownerId: userId,
            start: activeDat,
          },
        });
      } else {
        if (findWorkItem.stage + 1 === 4 && findWorkItem.table === "Release") {
          await prisma.workItem.update({
            where: { id: workItemId },
            data: {
              stage: findWorkItem.stage + 1,
              lead_time: activeDat - findWorkItem.start,
              end: activeDat,
            },
          });
        } else {
          await prisma.workItem.update({
            where: { id: workItemId },
            data: { stage: findWorkItem.stage + 1 },
          });
        }
      }
    }
  }

  const ifAllUsersMoved = await prisma.user.findMany({
    where: { NOT: { moves: activeDat }, gameKey },
  });

  if (ifAllUsersMoved.length === 0) {
    await prisma.game.update({
      where: { code: gameKey },
      data: { day: activeDat + 1 },
    });
    return res.status(200).json({ nextDay: true });
  } else {
    return res.status(200).json({ nextDay: false });
  }
});

workItemRouter.post("/getWorkItems", async (req, res) => {
  const body = await req.body;
  console.log(body);
  const gameCode = body.gameCode;

  const allWorkItems = await prisma.workItem.findMany({
    where: { game_id: gameCode },
    include: { owner: true },
  });

  const strategic = allWorkItems.filter(
    (item) => item.table === "Strategic Value"
  );
  const developemnt = allWorkItems.filter(
    (item) => item.table === "Development"
  );
  const desing = allWorkItems.filter((item) => item.table === "Design");
  const release = allWorkItems.filter((item) => item.table === "Release");

  return res.status(200).json({
    "Strategic Value": strategic,
    Development: developemnt,
    Design: desing,
    Release: release,
  });
});

workItemRouter.post("/drawCard", async (req, res) => {
  const body = await req.body;

  const user_id = body.userId;

  const isGreen = Number(Math.random().toFixed()) === 1 ? true : false;

  if (isGreen) {
    return res.status(200).json({ card: "green" });
  } else {
    return res.status(200).json({ card: "red" });
  }
});

export default workItemRouter;
