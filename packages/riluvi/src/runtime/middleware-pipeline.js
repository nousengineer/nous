export class MiddlewarePipeline {
  constructor(middleware = []) {
    this.middleware = middleware;
  }

  async run(context, terminalHandler) {
    let index = -1;

    const dispatch = async (nextIndex) => {
      if (nextIndex <= index) {
        throw new Error("Middleware next() called multiple times.");
      }

      index = nextIndex;
      const layer = this.middleware[nextIndex];

      if (!layer) {
        await terminalHandler();
        return;
      }

      await layer(context, () => dispatch(nextIndex + 1));
    };

    await dispatch(0);
  }
}
