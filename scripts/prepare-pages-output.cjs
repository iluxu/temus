const { cp, rm } = require("fs/promises");
const { existsSync } = require("fs");
const path = require("path");

const source = path.join(process.cwd(), "site", "out");
const destination = path.join(process.cwd(), "out");

if (!existsSync(source)) {
  console.error("Expected site/out to exist. Run the site build first.");
  process.exit(1);
}

async function main() {
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
  console.log("Prepared Pages output at ./out");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
