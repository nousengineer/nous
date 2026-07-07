import { MiddlewarePipeline } from "./middleware-pipeline.js";
import { TurnContext } from "./turn-context.js";

export class AssistantRuntime {
  constructor({ name, signature, skills, stateStore, middleware = [] }) {
    this.name = name;
    this.signature = signature;
    this.skills = skills;
    this.stateStore = stateStore;
    this.pipeline = new MiddlewarePipeline(middleware);
  }

  async run(activity) {
    const context = new TurnContext({
      activity,
      runtime: this,
      stateStore: this.stateStore,
    });

    await context.loadState();

    await this.pipeline.run(context, async () => {
      const skill = this.skills.find((candidate) => candidate.canHandle(context));

      if (skill) {
        await context.send(await skill.handle(context));
      }
    });

    await context.saveState();

    return context.response ?? {
      type: "message",
      text: "",
    };
  }
}
