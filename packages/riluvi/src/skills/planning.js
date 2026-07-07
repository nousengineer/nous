export const planningSkill = {
  name: "planning",
  description: "Turns a product or automation goal into a concise execution plan.",
  examples: ["plan build a support agent", "roadmap for Riluvi Flow"],
  canHandle(context) {
    return /\b(plan|roadmap|strategy|estratégia|planejar)\b/i.test(context.text);
  },
  handle(context) {
    const goal = context.text.replace(/\b(plan|roadmap|strategy|estratégia|planejar)\b/gi, "").trim();
    const subject = goal || "the requested Riluvi capability";

    return [
      `Plan for ${subject}:`,
      "1. Define the user intent and success criteria.",
      "2. Map the required skills, data sources, and execution boundaries.",
      "3. Build the smallest useful assistant loop: receive, route, respond.",
      "4. Add memory, integrations, and approval gates only where they reduce user effort.",
      "5. Package the capability as a Riluvi product module.",
    ].join("\n");
  },
};
