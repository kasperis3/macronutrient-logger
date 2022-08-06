const express = require('express');
const morgan = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const store = require('connect-loki');

const app = express();
const LokiStore = store(session);
const PORT = 3000;
const HOST = "localhost";

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(session({
  cookie: {
  	httpOnly: true,
  	maxAge: 31 * 24 * 60 * 60 * 1000,
  	path: "/",
  	secure: false,
  },
  name: "ls-macros-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use(flash());

app.get("/", (req, res, next) => {
  res.render("welcome");
});


app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

app.listen(PORT, HOST, () => {
  console.log(`Macros is listening on port ${PORT} of ${HOST}...`);
});