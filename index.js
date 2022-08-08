const config = require('./lib/config');
const express = require('express');
const morgan = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const catchError = require('./lib/catch-error');
const PgPersistence = require('./lib/pg-persistence');
const store = require('connect-loki');


const app = express();
const PORT = config.PORT;
const HOST = config.HOST;
const LokiStore = store(session);


app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

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

app.get("/history", 
  catchError(async (req, res, next) => {
  	res.render("history");
  })
);

app.post("/process-request", 
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	let list = req.body.list.split(","); // req.body.list of food items eaten today
 	let fat = req.body.fat;
 	let netCarb = req.body.carb;
 	let prot = req.body.prot;
 	console.log(list.join(" oAR "));
 	console.log([fat, netCarb, prot].join(" yEs "));
 	let result = await store.searchAndDestroy(list[0]);
 	res.redirect("/dashboard");
 	next();
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