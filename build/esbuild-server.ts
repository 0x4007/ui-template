import esbuild from "esbuild";
import { esBuildContext, PORT } from "./esbuild-build";
import { killPortProcess } from "./kill-port";
console.log("Starting development server...");

(async () => {
  try {
    await server();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})().catch(console.error);

export async function server() {
  // Kill any existing process on the port
  killPortProcess(PORT);

  console.log("Creating esbuild context...");
  const _context = await esbuild.context(esBuildContext);

  console.log("Starting server...");
  const { host, port } = await _context.serve({
    servedir: "static",
    port: PORT,
    host: "localhost",
  });

  console.log(`Server running at http://${host}:${port}`);
  console.log(`Serving files from: ${process.cwd()}/static`);

  // Keep the process running
  await new Promise(() => {});
}
