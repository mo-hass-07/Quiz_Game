const bcrypt = require("bcrypt")
const { resetDB, request, app, prisma } = require("./helpers");

beforeEach(resetDB);

it("registers, hashes the password, returns a token", async () => {
  const res = await request(app).post("/api/auth/register")
    .send({ email: "a@test.io", password: "123456", name: "test_io" });

  expect(res.status).toBe(201);
  expect(res.body.token).toEqual(expect.any(String));

  const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
  expect(user.password).not.toBe("123456");                          // not plain
  expect(await bcrypt.compare("123456", user.password)).toBe(true);  // valid hash
});
