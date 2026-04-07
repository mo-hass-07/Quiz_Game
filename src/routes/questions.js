const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /questions
// List all questions
router.get("/", (req, res) => {
    const { keyword } = req.query;

    if(!keyword){
        return res.json(questions);
    }
    const filtered_questions= questions.filter(question => question.keywords.includes(keyword.toLowerCase()))
    res.json(filtered_questions);
});

router.get ("/:questionid", (req, res) => {

    const questionid = Number(req.params.questionid);

    const question = questions.find((q) => q.id === questionid);

    if (!question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
});

// POST /questions
// Create a new post
router.post("/", (req, res) => {

  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }
  const maxId = Math.max(...questions.map(q => q.id), 0);

  const newquestion = {
    id: questions.length ? maxId + 1 : 1,
    question, 
    answer,
    keywords: Array.isArray(keywords) ? keywords : []
  };
  questions.push(newquestion);
  res.status(201).json(newquestion);
});

// edit an existing question or answer
router.put ("/:questionid", (req, res) => {

    const questionid = Number(req.params.questionid);
    const find_question = questions.find((q) => q.id === questionid);
    if (!find_question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
        return res.status(400).json({
        message: "question and answer are required"
    });
    }
    find_question.question = question
    find_question.answer = answer
    find_question.keywords = Array.isArray(keywords) ? keywords : [];


    res.json(find_question);
});

// delete a question
router.delete ("/:questionid", (req, res) => {

    const questionid = Number(req.params.questionid);
    const question_index = questions.findIndex(q => q.id === questionid)
    if (question_index === -1) {
        return res.status(404).json({ message: 'Question not found' });
    }
    
    const deleted_question = questions.splice(question_index,1)

    res.status(201).json({ message: 'Successfully deleted' });
});


module.exports = router;
