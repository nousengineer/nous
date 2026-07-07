export class TurnContext {
  constructor({ activity, runtime, stateStore }) {
    this.activity = activity;
    this.runtime = runtime;
    this.stateStore = stateStore;
    this.response = null;
    this.state = {
      user: {},
      conversation: {},
    };
  }

  get text() {
    return this.activity.text ?? "";
  }

  async loadState() {
    this.state.user = await this.stateStore.getUserState(this.activity);
    this.state.conversation = await this.stateStore.getConversationState(this.activity);
  }

  async saveState() {
    await this.stateStore.setUserState(this.activity, this.state.user);
    await this.stateStore.setConversationState(this.activity, this.state.conversation);
  }

  async send(text) {
    this.response = {
      type: "message",
      text,
    };
  }
}
