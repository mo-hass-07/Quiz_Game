const app = require("./app")
const prisma = require("./lib/prisma");
const PORT = process.env.PORT || 3000;
const logger = require("./lib/logger");
// Start the server
app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server Listening");
});
// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
