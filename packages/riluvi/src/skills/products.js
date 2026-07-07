const products = [
  ["Riluvi Code", "engineering and code automation"],
  ["Riluvi Flow", "workflow and operations automation"],
  ["Riluvi Agent", "autonomous task execution"],
  ["Riluvi Assist", "conversational productivity assistance"],
];

export const productsSkill = {
  name: "products",
  description: "Explains Riluvi as a product platform.",
  examples: ["what is riluvi", "products", "riluvi ai"],
  canHandle(context) {
    return /\b(riluvi|products?|produto|produtos)\b/i.test(context.text);
  },
  handle(context) {
    const lines = products.map(([name, description]) => `- ${name}: ${description}`);

    return [
      `${context.runtime.name} is the assistant platform from Chronokairo.`,
      context.runtime.signature,
      "",
      "Product directions:",
      ...lines,
    ].join("\n");
  },
};
