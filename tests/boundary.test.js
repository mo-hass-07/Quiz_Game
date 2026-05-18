const { question } = require("../src/lib/prisma");
const {createQuestion, resetDB, RegisterAndLogin, request, app, prisma } = require("./helpers");
beforeEach(resetDB);

describe("question tests", () => {
    
    it("clamps limit above 100 to 100", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");
    const res = await request(app).get("/api/questions?limit=999")
        .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);   // clamped, not 999
    });

});
