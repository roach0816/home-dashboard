export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWidgetRefreshScheduler } = await import("@/lib/widgets/backgroundRefresh");
    startWidgetRefreshScheduler();
  }
}
