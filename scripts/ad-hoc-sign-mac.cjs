const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

module.exports = async function adHocSignMac(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appFileName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = join(context.appOutDir, appFileName);
  if (!existsSync(appPath)) {
    throw new Error(`macOS app bundle not found: ${appPath}`);
  }

  const appId = context.packager.appInfo.appId || "local.screen-region-recorder";
  await run("codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    "--identifier",
    appId,
    appPath
  ]);
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}
