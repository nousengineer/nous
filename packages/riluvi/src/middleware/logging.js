export async function loggingMiddleware(context, next) {
  context.state.conversation.turnCount = (context.state.conversation.turnCount ?? 0) + 1;
  await next();
}
