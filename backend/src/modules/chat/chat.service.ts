import prisma from '../../lib/prisma';
import { sendPushToUser } from '../../lib/pushNotifications';

/**
 * Loads a contract with property + tenant if the given user may access its chat.
 * Access is granted to the property owner and to the linked tenant user.
 */
async function getAccessibleContract(userId: string, contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true, tenant: true },
  });
  if (!contract) return null;
  const isOwner = contract.property.userId === userId;
  const isTenant = contract.tenant?.userId === userId;
  if (!isOwner && !isTenant) return null;
  return contract;
}

function serializeMessage(
  m: { id: string; body: string; senderId: string; readAt: Date | null; createdAt: Date; sender: { name: string } },
  userId: string
) {
  return {
    id: m.id,
    body: m.body,
    senderId: m.senderId,
    senderName: m.sender.name,
    mine: m.senderId === userId,
    readAt: m.readAt,
    createdAt: m.createdAt,
  };
}

/** Lists every chat conversation the user takes part in (as owner or tenant). */
export async function getConversations(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: {
      OR: [
        { property: { userId }, tenant: { userId: { not: null } } },
        { tenant: { userId } },
      ],
    },
    include: {
      property: { include: { user: true } },
      tenant: { include: { user: true } },
    },
  });

  const conversations = await Promise.all(
    contracts.map(async (c) => {
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { contractId: c.id },
        orderBy: { createdAt: 'desc' },
      });
      const unreadCount = await prisma.chatMessage.count({
        where: { contractId: c.id, senderId: { not: userId }, readAt: null },
      });
      const isOwner = c.property.userId === userId;
      return {
        contractId: c.id,
        propertyName: c.property.name,
        propertyAddress: c.property.address,
        otherPartyName: isOwner ? c.tenant?.name ?? 'Inquilino' : c.property.user.name,
        otherPartyRole: isOwner ? 'TENANT' : 'OWNER',
        lastMessage: lastMessage?.body ?? null,
        lastMessageAt: lastMessage?.createdAt ?? null,
        unreadCount,
      };
    })
  );

  conversations.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return conversations;
}

export async function getMessages(userId: string, contractId: string) {
  const contract = await getAccessibleContract(userId, contractId);
  if (!contract) return null;

  const messages = await prisma.chatMessage.findMany({
    where: { contractId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { name: true } } },
  });

  return messages.map((m) => serializeMessage(m, userId));
}

export async function sendMessage(userId: string, contractId: string, body: string) {
  const contract = await getAccessibleContract(userId, contractId);
  if (!contract) return null;

  const message = await prisma.chatMessage.create({
    data: { contractId, senderId: userId, body },
    include: { sender: { select: { name: true } } },
  });

  const recipientId =
    contract.property.userId === userId ? contract.tenant?.userId : contract.property.userId;
  if (recipientId) {
    sendPushToUser(recipientId, 'Nuevo mensaje', message.sender.name + ': ' + body, {
      type: 'chat',
      contractId,
    });
  }

  return serializeMessage(message, userId);
}

export async function markRead(userId: string, contractId: string) {
  const contract = await getAccessibleContract(userId, contractId);
  if (!contract) return null;

  await prisma.chatMessage.updateMany({
    where: { contractId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return { ok: true };
}
