import express from "express";
import { prisma } from "../../prisma/client";
const workItemRouter = express.Router();
import { IO } from "../../types/socket";
import { deleteFromTable } from "./deleteFromTable";

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
  const gameKey = findWorkItem?.game_id as string;

  const io: IO = req.app.get("socketio");

  if (Number(activeDat) === Number(userMoves)) {
    return res.status(200).json({ msg: "You have already made your move" });
  }
  const currentRound = findWorkItem?.owner?.game?.round;

  if (findWorkItem && findWorkItem.stage !== 1 && findWorkItem.stage !== 4) {
    if (currentRound === 1 && findWorkItem?.ownerId !== userId) {
      return res
        .status(200)
        .json({ msg: "In this round you can only move yours tasks" });
    }

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
        data: {
          stage: moveNewItem?.stage + 1,
          ownerId: userId,
          start: moveNewItem.start !== 0 ? moveNewItem.start : activeDat,
        },
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

      if (activeDat % 10 === 0) {
        const currentRound = findWorkItem.owner?.game?.round;
        if (currentRound) {
          const round = currentRound + 1;
          if (round === 3) {
            deleteFromTable("Development", gameKey as string, 5);
            deleteFromTable("Release", gameKey as string, 5);
            deleteFromTable("Design", gameKey as string, 10);
            deleteFromTable("Strategic Value", gameKey as string, 10);
          }

          await prisma.game.update({
            where: { code: gameKey },
            data: { round },
          });
          io.emit("newStage", { newStage: round });
        }
      }

      if (activeDat % 3 === 0) {
        await prisma.workItem.updateMany({
          where: { stage: 4, table: "Strategic Value" },
          data: {
            stage: 1,
            table: "Design",
          },
        });

        await prisma.workItem.updateMany({
          where: { stage: 4, table: "Design" },
          data: {
            stage: 1,
            table: "Development",
          },
        });

        await prisma.workItem.updateMany({
          where: { stage: 4, table: "Development" },
          data: {
            stage: 1,
            table: "Release",
          },
        });
      }

      io.emit("newDay", { newDay: activeDat + 1 });

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
  const io: IO = req.app.get("socketio");

  let [findWorkItem, user] = await Promise.all([
    prisma.workItem.findUnique({
      where: { id: workItemId },
      include: { owner: { include: { game: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { game: true },
    }),
  ]);

  const activeDat = Number(user?.game?.day);
  const userMoves = user?.moves as number;
  const gameKey = findWorkItem?.game_id;

  if (Number(activeDat) === Number(userMoves)) {
    return res.status(200).json({ msg: "You have already made your move" });
  }

  const currentRound = findWorkItem?.owner?.game?.round;

  if (findWorkItem) {
    if (currentRound === 1 && findWorkItem?.ownerId !== userId) {
      return res
        .status(200)
        .json({ msg: "In this round you can only move yours tasks" });
    }

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
            start: findWorkItem.start !== 0 ? findWorkItem.start : activeDat,
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

    if (activeDat % 10 === 0) {
      const currentRound = user?.game?.round;
      if (currentRound) {
        const round = currentRound + 1;
        if (round === 3) {
          deleteFromTable("Development", gameKey as string, 5);
          deleteFromTable("Release", gameKey as string, 5);
          deleteFromTable("Design", gameKey as string, 10);
          deleteFromTable("Strategic Value", gameKey as string, 10);
        }

        await prisma.game.update({
          where: { code: gameKey },
          data: { round },
        });
        io.emit("newStage", { newStage: round });
      }
    }

    if (activeDat % 3 === 0) {
      await prisma.workItem.updateMany({
        where: { stage: 4, table: "Strategic Value" },
        data: {
          stage: 1,
          table: "Design",
        },
      });

      await prisma.workItem.updateMany({
        where: { stage: 4, table: "Design" },
        data: {
          stage: 1,
          table: "Development",
        },
      });

      await prisma.workItem.updateMany({
        where: { stage: 4, table: "Development" },
        data: {
          stage: 1,
          table: "Release",
        },
      });
    }
    io.emit("newDay", { newDay: activeDat + 1 });

    return res.status(200).json({ nextDay: true });
  } else {
    return res.status(200).json({ nextDay: false });
  }
});

workItemRouter.post("/getWorkItems", async (req, res) => {
  const body = await req.body;
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
  const isGreen =
    Number(Math.floor(Math.random() * 3) + 1) === 1 ? false : true;

  if (isGreen) {
    return res.status(200).json({ card: "green" });
  } else {
    return res.status(200).json({ card: "red" });
  }
});

export default workItemRouter;
