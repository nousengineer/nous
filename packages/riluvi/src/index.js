import { CliAdapter } from "./adapters/cli-adapter.js";
import { fallbackMiddleware } from "./middleware/fallback.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { AssistantRuntime } from "./runtime/assistant-runtime.js";
import { greetingSkill } from "./skills/greeting.js";
import { planningSkill } from "./skills/planning.js";
import { productsSkill } from "./skills/products.js";
import { MemoryStateStore } from "./state/memory-state-store.js";

const runtime = new AssistantRuntime({
  name: process.env.RILUVI_APP_NAME || "Riluvi AI",
  signature: process.env.RILUVI_BRAND_SIGNATURE || "Built by Chronokairo.",
  skills: [greetingSkill, productsSkill, planningSkill],
  stateStore: new MemoryStateStore(),
  middleware: [loggingMiddleware, fallbackMiddleware],
});

const adapter = new CliAdapter({ runtime });
const args = process.argv.slice(2);

if (args.includes("--chat")) {
  await adapter.startChat();
} else {
  const prompt = args.join(" ");
  await adapter.send(prompt);
}
