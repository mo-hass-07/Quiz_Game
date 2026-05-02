const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    name: question.user ? question.user.name : null,
    user:undefined,
    attemptCount: question._count?.attempts ?? 0,
    attemptted: question.attempts ? question._count.attempts > 0 : false,
    attempts: undefined,
    _count: undefined,
  };
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Apply authentication to ALL routes in this router
router.use(authenticate);

// GET /questions
// List all questions
router.get("/", async(req, res) => {
    const { keyword } = req.query;

    const where = keyword ? { keywords: { some: { name: keyword } } }: {};
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));

    const skip = (page - 1) * limit;

    const [question,total] = await Promise.all([ 
      prisma.question.findMany({
      where,
      include: { 
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { attempts: true } }, 

      },
      orderBy: { id: "asc" },
      skip,
      take: limit
    }),
      prisma.question.count({ where }),
    ]);

    res.json({data: question.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),});
});

router.get ("/:questionid", async(req, res) => {

    const questionid = Number(req.params.questionid);

    const question = await prisma.question.findUnique({
        where: { id: questionid },
        include: { keywords: true, user: true },
    });

    if (!question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    res.json(formatQuestion(question));
});

// POST /questions
// Create a new post
router.post("/", upload.single("image"), async (req, res) => {

  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newquestion = await prisma.question.create({
    data: {
      question, answer,
      userId: req.user.userId,
      imageUrl,
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
router.put ("/:questionid", isOwner, upload.single("image"), async(req, res) => {

    const questionid = Number(req.params.questionid);
    const find_question = await prisma.question.findUnique({ where: { id: questionid } });
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
        return res.status(400).json({
        message: "question and answer are required"
    });}

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: questionid },
        data: {
        question, answer,imageUrl,
        keywords: {
            set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
            })),
        },
        },
        include: { keywords: true, user: true  ,attempts: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { attempts: true } }, },
    });

    res.json(formatQuestion(updatedQuestion));
});

// delete a question
router.delete ("/:questionid", isOwner ,async(req, res) => {

    const questionid = Number(req.params.questionid);
    const find_question = await prisma.question.findUnique({ where: { id: questionid }, include: { keywords: true },});
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }
    
    await prisma.question.delete({ where: { id: questionid } });

    res.status(201).json({ message: 'Successfully deleted' });
});

router.post("/:questionid/attempt", async (req, res) => {
  const questionId = Number(req.params.questionid);
  const { answer } = req.body;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const isCorrect =
    answer.trim().toLowerCase() ===
    question.answer.trim().toLowerCase();

  const attempt = await prisma.attempt.upsert({
    where: {
      userId_questionId: {
        userId: req.user.userId,
        questionId,
      },
    },
    update: {},
    create: {
      userId: req.user.userId,
      questionId,
    },
  });

  const attemptCount = await prisma.attempt.count({
    where: { questionId },
  });

  res.status(201).json({
    id: attempt.id,
    questionId,
    attempted: true,
    attemptCount,
    createdAt: attempt.createdAt,
    correct: isCorrect,
    correctAnswer: isCorrect ? null : question.answer,
  });
});

router.delete("/:questionid/attempt", async (req, res) => {

    const questionId = Number(req.params.questionid);

    const find_question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    const attempt = await prisma.attempt.deleteMany({
        where: { userId: req.user.userId, questionId  }
      });

    const attemptCount = await prisma.attempt.count({ where: { questionId } });

    res.status(201).json({
        questionId,
        attempted: false,
        attemptCount,

    });
});

module.exports = router;
