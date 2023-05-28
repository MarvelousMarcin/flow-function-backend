import express from "express";
import { prisma } from "../../prisma/client";
const workItemRouter = express.Router();

workItemRouter.post("/blockWorkItem", async (req, res) => {
  const body = await req.body;
  const workItemId = body.data.workItemId;
  const userId = body.data.userId;

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

export default workItemRouter;
