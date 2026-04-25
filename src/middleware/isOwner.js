const prisma = require("../lib/prisma");

async function isOwner (req, res, next) {

    const id = Number(req.params.postId);
    const question = await prisma.question.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!question) {
      return res.status(404).json({ message: "No Such Question Exist" });
    }

    if (post.userId !== req.user.userId) {
      return res.status(403).json({ error: "You are not authorize to modify this question" });
    }

    // Attach the record to the request so the route handler can reuse it
    req.question = question;
    next();
  
}

module.exports = isOwner;

/*How it works
Looks up the post by ID from the URL parameter
Returns 404 if the post doesn’t exist
Compares post.userId with req.user.userId (set by the authenticate middleware) — returns 403 if they don’t match
Attaches the record to req.post so the route handler can use it without querying the database again
 */