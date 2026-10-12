// Optional local executable override; test assertions are unchanged.
import { chromium } from "playwright";
if (process.env.CHOPDOT_CHROMIUM_EXECUTABLE) {
  const launch = chromium.launch.bind(chromium);
  chromium.launch = (options) =>
    launch({
      ...options,
      executablePath: process.env.CHOPDOT_CHROMIUM_EXECUTABLE,
      args: [
        ...(options?.args || []),
        ...(process.env.CHOPDOT_CHROMIUM_ARGS
          ? JSON.parse(process.env.CHOPDOT_CHROMIUM_ARGS)
          : ["--no-sandbox", "--disable-dev-shm-usage"]),
      ],
    });
}
