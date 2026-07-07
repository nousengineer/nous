export function createMessageActivity({ text, channelId = "cli", from = "local-user", conversationId = "local" }) {
  return {
    id: crypto.randomUUID(),
    type: "message",
    channelId,
    from: { id: from },
    conversation: { id: conversationId },
    text,
    timestamp: new Date().toISOString(),
  };
}
