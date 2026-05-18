const { question } = require("../src/lib/prisma");
const {createQuestion, resetDB, RegisterAndLogin, request, app, prisma } = require("./helpers");
beforeEach(resetDB);

describe("question tests", () => {
it("returns 401 without a token", async () => {
  const res = await request(app).get("/api/questions");
  expect(res.status).toBe(401);
});

it("returns 404 for unknown question", async () => {
  const token = await RegisterAndLogin("alice@test.io", "Alice");
  const res = await request(app).get("/api/questions/99999")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Question Not Found!");
});

it("returns 400 for invalid post body", async () => {
  const token = await RegisterAndLogin("alice@test.io", "Alice");
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "" });
  expect(res.status).toBe(400);
});

it("returns 403 when editing someone else's question", async () => {
  const aliceToken = await RegisterAndLogin("alice@test.io", "Alice");
  const ques = await createQuestion(aliceToken, { question: "Alice's Question", answer:"Alice's Answer" });

  const bobToken = await RegisterAndLogin("bob@test.io", "Bob");

  const res = await request(app).put(`/api/questions/${ques.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ question: "hijacked", answer: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.question.findUnique({ where: { id: ques.id } });
  expect(after.question).toBe("Alice's Question");  // unchanged
});

it("creates an attempt", async () => {
  const token = await RegisterAndLogin("alice@test.io", "Alice");

  const ques = await createQuestion(token, {
    question: "2+2?",
    answer: "4",
  });

  const res = await request(app)
    .post(`/api/questions/${ques.id}/attempt`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      answer: "4",
    });

  expect(res.status).toBe(201);
  expect(res.body.correct).toBe(true);
});

it("returns correct answer when submitted answer is wrong", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const ques = await createQuestion(token, {
      question: "Capital of France?",
      answer: "Paris",
    });

    const res = await request(app)
      .post(`/api/questions/${ques.id}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer: "London",
      });

    expect(res.status).toBe(201);

    expect(res.body.correct).toBe(false);
    expect(res.body.correctAnswer).toBe("Paris");
    expect(res.body.attempted).toBe(true);
    expect(res.body.questionId).toBe(ques.id);
  });


  it("returns 404 when attempting unknown question", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const res = await request(app)
      .post("/api/questions/99999/attempt")
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer: "whatever",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question Not Found!");
  });

  it("does not create duplicate attempts for same user", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const ques = await createQuestion(token, {
      question: "2+2?",
      answer: "4",
    });

    const first = await request(app)
      .post(`/api/questions/${ques.id}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer: "4",
      });

    const second = await request(app)
      .post(`/api/questions/${ques.id}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer: "4",
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const count = await prisma.attempt.count({
      where: {
        questionId: ques.id,
      },
    });

    expect(count).toBe(1);
  });

  it("deletes an attempt", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const ques = await createQuestion(token, {
      question: "2+2?",
      answer: "4",
    });

    await request(app)
      .post(`/api/questions/${ques.id}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        answer: "4",
      });

    const res = await request(app)
      .delete(`/api/questions/${ques.id}/attempt`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);

    expect(res.body.attempted).toBe(false);
    expect(res.body.questionId).toBe(ques.id);
    expect(res.body.attemptCount).toBe(0);

    const count = await prisma.attempt.count({
      where: {
        questionId: ques.id,
      },
    });

    expect(count).toBe(0);
  });

   it("returns 404 when deleting attempt for unknown question", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const res = await request(app)
      .delete("/api/questions/99999/attempt")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question Not Found!");
  });

  it("updates a question successfully", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const ques = await createQuestion(token, {
      question: "Old Question",
      answer: "Old Answer",
    });

    const res = await request(app)
      .put(`/api/questions/${ques.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "New Question",
        answer: "New Answer",
        keywords: ["javascript", "node"],
      });

    expect(res.status).toBe(200);

    expect(res.body.id).toBe(ques.id);
    expect(res.body.question).toBe("New Question");
    expect(res.body.answer).toBe("New Answer");

    const updated = await prisma.question.findUnique({
      where: { id: ques.id },
      include: { keywords: true },
    });

    expect(updated.question).toBe("New Question");
    expect(updated.answer).toBe("New Answer");
    expect(updated.keywords.length).toBe(2);
  });

  it("returns 400 when updating with invalid data", async () => {
    const token = await RegisterAndLogin("alice@test.io", "Alice");

    const ques = await createQuestion(token);

    const res = await request(app)
      .put(`/api/questions/${ques.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "",
        answer: "",
      });

    expect(res.status).toBe(400);
  });

  it("returns 403 when editing someone else's question", async () => {
    const aliceToken = await RegisterAndLogin(
      "alice@test.io",
      "Alice"
    );

    const ques = await createQuestion(aliceToken, {
      question: "Alice's Question",
      answer: "Alice's Answer",
    });

    const bobToken = await RegisterAndLogin(
      "bob@test.io",
      "Bob"
    );

    const res = await request(app)
      .put(`/api/questions/${ques.id}`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({
        question: "Hacked",
        answer: "X",
      });

    expect(res.status).toBe(403);

    const after = await prisma.question.findUnique({
      where: { id: ques.id },
    });

    expect(after.question).toBe("Alice's Question");
  });

    it("deletes a question successfully", async () => {
    const token = await RegisterAndLogin();

    const ques = await createQuestion(token);

    const res = await request(app)
      .delete(`/api/questions/${ques.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Successfully deleted");

    const deleted = await prisma.question.findUnique({
      where: { id: ques.id },
    });

    expect(deleted).toBeNull();
  });



  it("returns 403 when deleting someone else's question", async () => {
    const aliceToken = await RegisterAndLogin(
      "alice@test.io",
      "Alice"
    );

    const ques = await createQuestion(aliceToken);

    const bobToken = await RegisterAndLogin(
      "bob@test.io",
      "Bob"
    );

    const res = await request(app)
      .delete(`/api/questions/${ques.id}`)
      .set("Authorization", `Bearer ${bobToken}`);

    expect(res.status).toBe(403);

    const existing = await prisma.question.findUnique({
      where: { id: ques.id },
    });

    expect(existing).not.toBeNull();
  });


});
