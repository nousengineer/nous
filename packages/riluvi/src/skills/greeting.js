export const greetingSkill = {
  name: "greeting",
  description: "Responds to greetings and introduces Riluvi AI.",
  examples: ["hello", "hi riluvi", "oi riluvi"],
  canHandle(context) {
    return /\b(hello|hi|hey|oi|ola|olá)\b/i.test(context.text);
  },
  handle(context) {
    return `${context.runtime.name} is online. ${context.runtime.signature}`;
  },
};
