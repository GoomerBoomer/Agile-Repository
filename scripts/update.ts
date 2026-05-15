import { execSync } from "child_process";

const APP_NAME = "agile-app";

function run(cmd: string) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  console.log("========================================");
  console.log("  CD Orchestration — VPS Update Script  ");
  console.log("========================================");

  console.log("\n[1/4] Pulling latest code from main...");
  run("git pull origin main");

  console.log("\n[2/4] Installing dependencies...");
  run("npm ci --production");

  console.log("\n[3/4] Rebuilding native modules...");
  run("npm rebuild better-sqlite3");

  console.log(`\n[4/4] Restarting app via PM2...`);
  try {
    run(`pm2 restart ${APP_NAME}`);
  } catch {
    console.log("App not yet registered in PM2 — starting fresh...");
    run(`pm2 start ecosystem.config.js`);
  }

  console.log("\n--- Health Check ---");
  run("pm2 status");

  console.log("\nDeployment complete.");
}

main();
