import type { ChatMessage } from '@/types/api';

export type MessageGroupPosition = 'only' | 'first' | 'middle' | 'last';

export interface MessageGroup {
  id: string;
  senderRole: ChatMessage['senderRole'];
  senderId: string;
  messages: ChatMessage[];
}

/**
 * Consecutive messages from the same sender are grouped so the avatar and
 * sender label are only rendered once per burst.
 */
export function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const last = groups.at(-1);
    if (last && last.senderId === message.senderId && last.senderRole === message.senderRole) {
      last.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderRole: message.senderRole,
        senderId: message.senderId,
        messages: [message],
      });
    }
  }

  return groups;
}

export function positionInGroup(index: number, total: number): MessageGroupPosition {
  if (total === 1) return 'only';
  if (index === 0) return 'first';
  if (index === total - 1) return 'last';
  return 'middle';
}

/** Deduplicates polling results so optimistic and broadcast copies do not double up. */
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...existing, ...incoming]) {
    byId.set(message.id, message);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}