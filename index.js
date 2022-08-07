const express = require('express');
const morgan = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const store = require('connect-loki');
const { body, validationResult } = require('express-validator');
const PgPersistence = require('./lib/pg-persistence');
const config = require('./lib/config');
const catchError = require('./lib/catch-error');

const app = express();
const LokiStore = store(session);
const PORT = config.PORT;
const HOST = config.HOST;

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
  secret: config.SECRET,
  store: new LokiStore({}),
}));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use(flash());

app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});

app.get("/", (req, res, next) => {
  res.redirect("/users/signin");
});

app.get("/users/signin", (req, res, next) => {
  res.render("welcome");
});

app.get("/dashboard", 
  catchError(async (req, res, next) => {
  	res.render("dashboard");
  })
);

app.post("/users/signin", 
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	console.log(store);
  	let username = req.body.username;
  	let password = req.body.password;
  	if ((username === "dev") && (!!password)) {
      console.log(username);
  	  res.redirect("/dashboard");
  	}
  	next();
  })
);


app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

app.listen(PORT, HOST, () => {
  console.log(`Macros is listening on port ${PORT} of ${HOST}...`);
});