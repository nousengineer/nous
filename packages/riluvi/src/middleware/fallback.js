export async function fallbackMiddleware(context, next) {
  await next();

  if (!context.response) {
    await context.send([
      "I do not have a skill for that yet.",
      "Try: hello, products, or plan <your goal>.",
    ].join("\n"));
  }
}
