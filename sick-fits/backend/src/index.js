const cookieParser = require('cookie-parser');
// we are using cookies as opposed to localStorage for User permissions
// because of SSR, SSR with localStorage will not read permissions credentials
// immediately
require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO Use express middleware to handle cookies (JSON web tokens)
// a middleware is a function that will run in the middle
// between your request and response
// here we will parse any of the requests and parse for cookies
server.express.use(cookieParser());
// TODO Use express middleware to populate current user
// decode the jwt so we can get the user id on each request
server.express.use((req, res, next) => {
  // cookieParser allows us to access any cookies
  // that come along the request
  const { token } = req.cookies;
  console.log(token);
  next();
});

server.start({
  // want our website to be hit from our specific urls
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  },
}, deets => {
  console.log(`Server is now running on port http://localhost:${deets.port}`);
})