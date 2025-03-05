/* eslint-disable */

import { execSync } from "child_process";

/**
 * Safely kills any process running on the specified port
 * @param port The port number to check and kill processes on
 */
export function killPortProcess(port: number): void {
  if (typeof port !== "number" || port < 1 || port > 65535) {
    throw new Error("Invalid port number");
  }

  try {
    // Using a safe port number and basic command
    const cmd = `lsof -ti:${port}`;
    const processIds = execSync(cmd, { encoding: "utf8" }).trim();

    if (processIds) {
      execSync(`kill -9 ${processIds}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && !error.message.includes("Command failed")) {
      // Only log unexpected errors, not the expected case of no process found
      console.error(`Error killing process on port ${port}:`, error.message);
    }
  }
}
