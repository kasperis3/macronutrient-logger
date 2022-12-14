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
};

const { renderFavoriteElements, getFoodStuffs, userSignIn, userCreate } = require('./lib/routes');

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

app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

const requiresAuthorization = (req, res, next) => {
  if (!res.locals.signedIn) {
  	res.redirect(302, "/users/signin");
  } else {
  	next();
  }
}

app.get("/", (req, res, next) => {
  res.redirect("/users/signin");
});

app.get("/users/signin", (req, res, next) => {
  res.render("welcome", {
  	flash: Object.assign(req.flash(), res.locals.flash),		
  });
});

app.get("/dashboard", 
  requiresAuthorization,
  catchError(async (req, res, next) => {
  	res.render("dashboard");
  })
);

app.get("/history",
  requiresAuthorization, 
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	let userMacros = await store.getUserMacros(res.locals.username);
  	console.log(Object.entries(userMacros));
  	res.render("history", {
  	  userMacros,
  	});
  })
);

app.get("/favorite-elements", 
  renderFavoriteElements,
);

app.post("/process-request", 
  requiresAuthorization,
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	let list = req.body.list.split(","); // req.body.list of food items eaten today
   	
   	console.log(list.join(" oAR "));

   	let foodListOptions = [];
   	for (let food of list) {
   	  let foodListQuery = await store.getFdcId(food);
   	  // console.log(foodListQuery);
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
  })
);

// this function accepts a list of fdcIds which is checked against the app database
// if the app contains it, move on. if the app does not contain it, query the food data
// api and add it to the database
const processFoods = async (store, fdcIds) => {
  for (let fdcId of fdcIds) {
   	let foodFound = await store.findFood(fdcId);
   	if (!foodFound) {
   	  // query api for food data 
   	  let result = await store.getFoodNutrients(fdcId);
   	  // add food data to app database
   	  if (!!result) {
   	  	let name = result.description;
   	  	let nutrients = result.foodNutrients;
   	  	const macroValues = {};
   	  	nutrients.forEach(foodNutrient => {
   	  	  let macro = nutrientNumberMap[foodNutrient.nutrient.number];
   	  	  macroValues[macro] = Number(foodNutrient.amount);
   	  	});
   	  	await store.addFood(fdcId, name, macroValues['Protein'], macroValues['Carbohydrate'], macroValues['Fiber'], macroValues['Fat']);
   	   }
   	}
  }
}

app.post("/process-select-foods",
  requiresAuthorization,
  catchError(async (req, res, next) => {
  	let store = res.locals.store;
  	let fdcIds = Object.values(req.body);
    let idsAndNames = [];

  	await processFoods(store, fdcIds);

    for (let fdcId of fdcIds) {
      let foodData = await store.getFood(fdcId);
      let name = foodData.name;
      idsAndNames.push([fdcId, name, foodData]);
    }

    res.render("select-portion", {
      idsAndNames,
    });
  })
);

app.post("/process-select-portion",
  requiresAuthorization,
  catchError(async (req, res, next) => {
    let store = res.locals.store;
    let info = Object.entries(req.body);
    let fdcIds = Object.keys(info);
    let portionSizes = Object.values(info);

    for (let item of info) {
      let [fdcId, portionSize] = item;
      // TODO: input validation here (eliminate g/grams/etc)
      portionSize = (portionSize / 100.0).toFixed(2);
      let foodId = await store.getFoodId(fdcId);
      let addedToUserEats = await store.addFoodToUserEats(foodId, res.locals.username, portionSize)
    }

    req.flash("success", "new foods added to your history");
    res.redirect("/dashboard");
  })
);

app.get("/food-stuffs", 
  getFoodStuffs,
);

app.post("/users/signin",
  userSignIn,
);

app.post("/users/create",
  userCreate, 
);

app.post("/users/signout", (req, res, next) => {
  delete req.session.username;
  delete req.session.signedIn;
  res.redirect("/users/signin");
})

app.get("/users/signout", (req, res, next) => {
  res.redirect("/users/signin");
});

app.get("/users/create", (req, res, next) => {
  res.render("create");
});


app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

app.listen(PORT, HOST, () => {
  console.log(`Macros is listening on port ${PORT} of ${HOST}...`);
});