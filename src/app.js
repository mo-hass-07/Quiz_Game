const express = require('express');

const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./lib/errors');
app.use(express.static(path.join(__dirname, '..', 'public')));
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");

app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));

app.use(express.json());

// everything under /api/posts

app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);



app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);
module.exports = app;