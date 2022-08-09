const config = require('./lib/config');
const express = require('express');
const morgan = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const catchError = require('./lib/catch-error');
const PgPersistence = require('./lib/pg-persistence');
const store = require('connect-loki');
const nutrientNumberMap = {
  '203': 'Protein',
  '204': 'Fat',
  '205': 'Carbohydrate',
  '208': 'Energy',
  '291': 'Fiber'
}

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
  res.locals.store.testQuery1();
  res.locals.store.testQuery2();
  next();
});

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
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

 	let foodListOptions = [];
 	for (let food of list) {
 	  let foodListQuery = await store.getFdcId(food);
 	  console.log(foodListQuery);
 	  foodListOptions.push(foodListQuery);
 	}

 	if (foodListOptions.every(list => list.length === 0)) {
 	  req.flash("error", "try your search again");
 	  res.render("dashboard", {
 	  	flash: req.flash(),
 	  });
 	}

 	res.render("select-food", {
 	  foodListOptions,
 	});

 	next();
  })
);

app.post("/process-select-foods", 
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	let fdcIds = Object.values(req.body);
  	console.log("enter process-select-foods");

 	for (let fdcId of fdcIds) {
 	  let foodFound = await store.findFood(fdcId);
 	  console.log("before main logic in for loop");
 	  if (!foodFound) {
 	  	// query api for food data 
 	  	console.log("not in app, query api")
 	  	let result = await store.getFoodNutrients(fdcId);
 	  	// add food data to app database
 	  	if (!!result) {
 	  	  // let fdcId = result.fdcId;
 	  	  let name = result.description;
 	  	  let nutrients = result.foodNutrients;
 	  	  const macroValues = {};
 	  	  nutrients.forEach(foodNutrient => {
 	  	  	let macro = nutrientNumberMap[foodNutrient.nutrient.number];
 	  	  	macroValues[macro] = Number(foodNutrient.amount);
 	  	  });
 	  	  console.log(macroValues);
 	  	  let added = await store.addFood(fdcId, name, macroValues['Protein'], macroValues['Carbohydrate'], macroValues['Fiber'], macroValues['Fat']);
 	  	}
 	  	// add entry to user_eats
 	  }
	  console.log("add new entry to user_eats");
	  let foodId = await store.getFoodId(fdcId);
	  let addedToUserEats = await store.addFoodToUserEats(foodId, 'dev'); 
 	}

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