export class MemoryStateStore {
  constructor() {
    this.userState = new Map();
    this.conversationState = new Map();
  }

  async getUserState(activity) {
    return structuredClone(this.userState.get(userKey(activity)) ?? {});
  }

  async setUserState(activity, state) {
    this.userState.set(userKey(activity), structuredClone(state));
  }

  async getConversationState(activity) {
    return structuredClone(this.conversationState.get(conversationKey(activity)) ?? {});
  }

  async setConversationState(activity, state) {
    this.conversationState.set(conversationKey(activity), structuredClone(state));
  }
}

function userKey(activity) {
  return `${activity.channelId}/users/${activity.from.id}`;
}

function conversationKey(activity) {
  return `${activity.channelId}/conversations/${activity.conversation.id}`;
}
