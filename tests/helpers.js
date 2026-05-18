const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

async function resetDB() {
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();
}

async function RegisterAndLogin(email = "a@test.io", name = "test_io") {
  await request(app).post("/api/auth/register")
    .send({ email, password: "123456", name });
  const res = await request(app).post("/api/auth/login")
    .send({ email, password: "123456" });
  return res.body.token;
}

async function createQuestion(token, overrides = {}) {
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "T", answer: "A", ...overrides });
  return res.body;
}

module.exports = { resetDB, RegisterAndLogin, createQuestion, request, app, prisma };
