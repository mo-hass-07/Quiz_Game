const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');
const { ValidationError, ConflictError, UnauthorizedError, NotFoundError } = require("../lib/errors");
const { z } = require("zod");
const csv = require("csv-parser");
const fs = require("fs");

const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
});


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

const csvUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") cb(null, true);
    else cb(new Error("Only CSV allowed"));
  },
});

// Apply authentication to ALL routes in this router
router.use(authenticate);

// GET /questions
// List all questions
router.get("/", async(req, res) => {
    const { keyword,difficulty } = req.query;

    const where = {
      ...(keyword ? { keywords: { some: { name: keyword } } } : {}),
      ...(difficulty ? { difficulty } : {})
    };
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

// to generate random quiz questions
router.get("/randomquiz", async (req, res) => {

  const questions = await prisma.question.findMany({
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: { userId: req.user.userId },
        take: 1,
      },
      _count: {
        select: { attempts: true },
      },
    },
  });

  const shuffled = questions.sort(() => Math.random() - 0.5);
  const random10 = shuffled.slice(0, 10);

  res.json(random10.map(formatQuestion));
});

// for batch upload questions from a csv
router.post("/batchupload", csvUpload.single("file"), async (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      error: "CSV file is required",
    });
  }

  const questions = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      questions.push(row);
    })
    .on("end", async () => {
      try {
        for (const row of questions) {
          const keywordsArray = row.keywords
            ? row.keywords.split("|").map((k) => k.trim())
            : [];

          await prisma.question.create({
            data: {
              question: row.question,
              answer: row.answer,
              difficulty: row.difficulty,
              userId: req.user.userId,
              keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                  where: { name: kw },
                  create: { name: kw },
                })),
              },
            },
          });
        }

        fs.unlinkSync(req.file.path);

        res.status(201).json({
          message: `${questions.length} Questions uploaded successfully`,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          error: "Failed to upload questions",
        });
      }
    });
});

// get a question with ID
router.get ("/:questionid", async(req, res) => {

    const questionid = Number(req.params.questionid);

    const question = await prisma.question.findUnique({
        where: { id: questionid },
        include: { keywords: true, user: true },
    });

    if (!question) {
      throw new NotFoundError ("Question Not Found!")
    }

    res.json(formatQuestion(question));
});

// Create a new question
router.post("/", upload.single("image"), async (req, res) => {

  const { question, answer, keywords, difficulty  } = QuestionInput.parse(req.body);

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newquestion = await prisma.question.create({
    data: {
      question, answer,
      userId: req.user.userId,
      imageUrl,
      difficulty,
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
        throw new NotFoundError ("Question Not Found!")
    }

    const { question, answer, keywords, difficulty } = QuestionInput.parse(req.body);

    if (!question || !answer) {
      throw new ValidationError ("Question and Answer are required!");}

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: questionid },
        data: {
        question, answer,imageUrl,difficulty,
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
        throw new NotFoundError ("Question Not Found!")
    }
    
    await prisma.question.delete({ where: { id: questionid } });

    res.status(201).json({ message: 'Successfully deleted' });
});

// for attempt
router.post("/:questionid/attempt", async (req, res) => {
  const questionId = Number(req.params.questionid);
  const { answer } = req.body;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new NotFoundError ("Question Not Found!")
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

// to delete an attempt
router.delete("/:questionid/attempt", async (req, res) => {

    const questionId = Number(req.params.questionid);

    const find_question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!find_question) {
        throw new NotFoundError ("Question Not Found!")
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
