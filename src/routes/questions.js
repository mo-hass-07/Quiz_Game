const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
  };
}


// GET /questions
// List all questions
router.get("/", async(req, res) => {
    const { keyword } = req.query;

    const where = keyword ? { keywords: { some: { name: keyword } } }: {};

  const question = await prisma.question.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

    res.json(question.map(formatQuestion));
});

router.get ("/:questionid", async(req, res) => {

    const questionid = Number(req.params.questionid);

    const question = await prisma.question.findUnique({
        where: { id: questionid },
        include: { keywords: true },
    });

    if (!question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    res.json(formatQuestion(question));
});

// POST /questions
// Create a new post
router.post("/", async (req, res) => {

  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newquestion = await prisma.question.create({
    data: {
      question, answer,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });

  
  res.status(201).json(formatQuestion(newquestion));
});

// edit an existing question or answer
router.put ("/:questionid", async(req, res) => {

    const questionid = Number(req.params.questionid);
    console.log(questionid)
    const find_question = await prisma.question.findUnique({ where: { id: questionid } });
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
        return res.status(400).json({
        message: "question and answer are required"
    });
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: questionid },
        data: {
        question, answer,
        keywords: {
            set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
            })),
        },
        },
        include: { keywords: true },
    });

    res.json(formatQuestion(updatedQuestion));
});

// delete a question
router.delete ("/:questionid", async(req, res) => {

    const questionid = Number(req.params.questionid);
    const find_question = await prisma.question.findUnique({ where: { id: questionid }, include: { keywords: true },});
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }
    
    await prisma.question.delete({ where: { id: questionid } });

    res.status(201).json({ message: 'Successfully deleted' });
});


module.exports = router;
