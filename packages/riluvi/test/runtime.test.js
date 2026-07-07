import assert from "node:assert/strict";
import { test } from "node:test";
import { createMessageActivity } from "../src/activities/activity.js";
import { fallbackMiddleware } from "../src/middleware/fallback.js";
import { loggingMiddleware } from "../src/middleware/logging.js";
import { AssistantRuntime } from "../src/runtime/assistant-runtime.js";
import { greetingSkill } from "../src/skills/greeting.js";
import { planningSkill } from "../src/skills/planning.js";
import { productsSkill } from "../src/skills/products.js";
import { MemoryStateStore } from "../src/state/memory-state-store.js";

function createRuntime() {
  return new AssistantRuntime({
    name: "Riluvi AI",
    signature: "Built by Chronokairo.",
    skills: [greetingSkill, productsSkill, planningSkill],
    stateStore: new MemoryStateStore(),
    middleware: [loggingMiddleware, fallbackMiddleware],
  });
}

test("routes product prompts to the products skill", async () => {
  const runtime = createRuntime();
  const response = await runtime.run(createMessageActivity({ text: "what is riluvi" }));

  assert.match(response.text, /assistant platform from Chronokairo/i);
  assert.match(response.text, /Riluvi Code/i);
});

test("routes planning prompts to the planning skill", async () => {
  const runtime = createRuntime();
  const response = await runtime.run(createMessageActivity({ text: "plan build a support agent" }));

  assert.match(response.text, /Plan for build a support agent/i);
  assert.match(response.text, /Define the user intent/i);
});

test("returns a fallback when no skill can handle the prompt", async () => {
  const runtime = createRuntime();
  const response = await runtime.run(createMessageActivity({ text: "unknown request" }));

  assert.match(response.text, /do not have a skill/i);
});
