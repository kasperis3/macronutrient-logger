const catchError = require('./catch-error');

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
};

const renderFavoriteElements = catchError(async (req, res, next) => {
	const NUTS = ['Almonds', 'Hazelnuts', 'Walnuts', 'Pecans', 'Macadamia', 'Cashew'];
	const SEEDS = ['Pumpkin Seeds', 'Sesame Seeds', 'Hemp Seeds', 'Chia Seeds', 'Sunflower Seeds'];
	const FDC_IDS_NUTS = [1100508, 170182, 170178, 170162, 1100524, 170187];
	const FDC_IDS_SEEDS = [170554, 170556, 1100608, 170562, 170148];

	let store = res.locals.store;
	let fdcIds = [...FDC_IDS_SEEDS, ...FDC_IDS_NUTS];

	await processFoods(store, fdcIds); // adds to app database

	let awesomeFoods = {}; // dict of food.description + macro nutrients

	for (let fdcId of fdcIds) {
	  let foodData = await store.getFood(fdcId);
	  awesomeFoods[foodData.name] = {
	  	'Protein': foodData.protein,
	  	'Carbohydrate': foodData.carbohydrate,
	  	'Fat': foodData.fat,
	  	'Fiber': foodData.fiber,
	  	'Net Carb': foodData['net carb'],
	  };
	}

	res.render("favorite-elements", {
	  awesomeFoods,
	});
});

const getFoodStuffs = catchError(async (req, res, next) => {
	// display what users have entered into the food-stuffs database so far
  let store = res.locals.store;
  let userEntries = await store.getAllUserEntries();
  console.log(userEntries);
  res.render("all-food-stuffs", {
    userEntries,
  });
});

const userSignIn = catchError(async (req, res) => {
	let store = res.locals.store;
	let username = req.body.username.trim();
	let password = req.body.password;

	if (await store.acceptsLoginCredentials(username, password)) {
	  req.flash("info", "Welcome");
    req.session.signedIn = true;
    req.session.username = username;
	  res.redirect("/dashboard");
	} else {
	  req.flash("error", "invalid log in credentials");
	  res.render("welcome", {
	  	flash: req.flash(),
	  	username, 
	  })
	}
});

const userCreate = catchError(async (req, res, next) => {
	let store = res.locals.store;
	let username = req.body.username.trim();
	let password = req.body.password;

	if (await store.addNewUser(username, password)) {
	  req.flash("success", "New user added");
	  res.redirect("/users/signin");
	} else {
	  req.flash("error", "username already exists");
	  res.render("create", {
	  	flash: req.flash(),
	  })
	}

});

module.exports = {
	renderFavoriteElements,
	getFoodStuffs,
	userSignIn,
	userCreate
};