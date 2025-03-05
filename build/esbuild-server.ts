import esbuild from "esbuild";
import { esBuildContext, PORT } from "./esbuild-build";
import { killPortProcess } from "./kill-port";
(async () => {
  await server();
})().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
export async function server() {
  // Kill any existing process on the port
  killPortProcess(PORT);

  const _context = await esbuild.context(esBuildContext);
  const { port } = await _context.serve({
    servedir: "static",
    port: PORT,
  });
  console.log(`http://localhost:${port}`);
}
