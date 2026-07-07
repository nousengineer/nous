import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createMessageActivity } from "../activities/activity.js";

export class CliAdapter {
  constructor({ runtime }) {
    this.runtime = runtime;
  }

  async send(text) {
    const activity = createMessageActivity({ text });
    const response = await this.runtime.run(activity);
    console.log(response.text);
  }

  async startChat() {
    const rl = readline.createInterface({ input, output });

    console.log(`${this.runtime.name} is online. ${this.runtime.signature}`);
    console.log("Type exit to close.");

    while (true) {
      const prompt = await rl.question("> ");

      if (/^(exit|quit|sair)$/i.test(prompt.trim())) {
        rl.close();
        break;
      }

      await this.send(prompt);
    }
  }
}
