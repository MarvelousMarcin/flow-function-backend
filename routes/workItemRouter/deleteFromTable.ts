import { prisma } from "../../prisma/client";

export const deleteFromTable = async (
  tableName: string,
  gameKey: string,
  howManyRecord: number
) => {
  // Delete workitems on Round 3 Start
  const recordsToDelete = await prisma.workItem.findMany({
    where: { OR: [{ game_id: gameKey, table: tableName, stage: 1 }] },
    take: howManyRecord,
  });

  const ids = recordsToDelete.map((item) => {
    return { id: item.id };
  });

  await prisma.workItem.deleteMany({ where: { OR: ids } });
};
