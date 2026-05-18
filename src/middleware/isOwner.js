const { ForbiddenError, NotFoundError } = require("../lib/errors");
const prisma = require("../lib/prisma");

async function isOwner (req, res, next) {

    const id = Number(req.params.questionid);
    const question = await prisma.question.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!question) {
      throw new NotFoundError ("No Such Question Exist");
    }

    if (question.userId !== req.user.userId) {
      throw new ForbiddenError("You are not authorize to modify this question" );
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