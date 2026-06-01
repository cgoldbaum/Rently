import prisma from './prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

async function sendExpoNotification(msg: PushMessage): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(msg),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error('[Push] Expo API error:', res.status, responseText);
    } else {
      console.log('[Push] Expo API response:', responseText);
    }
  } catch (err) {
    console.error('[Push] Failed to send notification:', err);
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<Array<{ expoPushToken: string | null }>>`
      SELECT "expoPushToken" FROM "User" WHERE id = ${userId}
    `;
    const token = rows[0]?.expoPushToken;
    console.log('[Push] sendPushToUser', userId, 'token:', token ? token.slice(0, 30) + '...' : 'NULL');
    if (!token) return;
    await sendExpoNotification({ to: token, title, body, sound: 'default', data });
    console.log('[Push] sent:', title, '->', body);
  } catch (err) {
    console.error('[Push] Error in sendPushToUser:', err);
  }
}
