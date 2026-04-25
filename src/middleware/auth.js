const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = authenticate;

/*How it works
Reads the Authorization header from the request
Checks it starts with Bearer
Extracts and verifies the JWT token using the secret
If valid, attaches the decoded user data to req.user and calls next()
If invalid, returns a 401 or 403 error
 */