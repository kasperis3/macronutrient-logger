const config = require('./config');
const { dbQuery } = require('./db-query');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const bcrypt = require('bcrypt');

module.exports = class PgPersistence {
  constructor(session) {
  	this.username = session.username;
  }

  async testQuery1() {
  	const SQL = 'SELECT * FROM food_stuffs';

  	let result = await dbQuery(SQL);
 
  	console.log("query1", result.rows);
  }

  async testQuery2() {
  	const SQL = 'SELECT * FROM user_eats';

  	let result = await dbQuery(SQL);

  	console.log("query2", result.rows);
  }

  async testQuery3() {
  	const SQL = 'SELECT * FROM users';

  	let result = await dbQuery(SQL);

  	console.log("query3", result.rows);
  }

  async findFood(fdcId) {
  	const FIND = 'SELECT * FROM food_stuffs WHERE fdcId = $1';

  	let result = await dbQuery(FIND, fdcId);

  	return result.rowCount > 0;
  }

  async addFood(fdcId, name, protein, carb, fiber, fat) {
  	const ADD = 'INSERT INTO food_stuffs (fdcId, name, protein, carbohydrate, fiber, fat) VALUES ($1, $2, $3, $4, $5, $6)';

  	const UPDATE = 'UPDATE food_stuffs SET "net carb" = food_stuffs.carbohydrate - food_stuffs.fiber';

  	let result = await dbQuery(ADD, fdcId, name, protein, carb, fiber, fat);
  	let update = await dbQuery(UPDATE);

  	return result.rowCount > 0 && update.rowCount > 0;

  }

  async getFoodId(fdcId) {
  	const FOOD_ID = 'SELECT id FROM food_stuffs WHERE fdcId = $1';

  	let result = await dbQuery(FOOD_ID, fdcId);

  	return result.rows[0].id;
  }

  async addFoodToUserEats(foodId, username) {
  	const ADD = 'INSERT INTO user_eats (food_id, username) VALUES ($1, $2)';

  	let result = await dbQuery(ADD, foodId, username);

  	return result.rowCount > 0;
  }

  // table USER_EATS 
  async getUserMacros(username) {
  	const USER_EATS = 'SELECT food_id, date FROM user_eats WHERE username = $1';
  	const FOOD_DATA = 'SELECT * FROM food_stuffs WHERE id = $1';

  	let data = [];
  	let result = await dbQuery(USER_EATS, this.username);
  	result.rows.forEach(foodEntry => {
  	  data.push(foodEntry.food_id); // something with dates here
  	});

  	let dataSum = { 'Protein': 0, 'Fat': 0, 'Net Carb': 0};
  	for (let food_id of data) {
  	  let foodData = await dbQuery(FOOD_DATA, food_id);
  	  console.log(foodData.rows[0]);
  	  dataSum['Protein'] += Number(foodData.rows[0].protein);
  	  dataSum['Fat'] += Number(foodData.rows[0].fat);
  	  dataSum['Net Carb'] += Number(foodData.rows[0]['net carb']);
  	}

  	console.log(dataSum);
  	return dataSum;
  }

  // table USERS controls
  async acceptsLoginCredentials(username, password) {
  	const USER_PASS = 'SELECT password FROM users WHERE username = $1';

  	let result = await dbQuery(USER_PASS, username);

  	if (result.rowCount === 0) return false;

  	return bcrypt.compare(password, result.rows[0].password);
  }

  // table USERS controls
  async addNewUser(username, password) {
  	const USER_EXISTS = 'SELECT * FROM users WHERE username = $1';

  	let exists = await dbQuery(USER_EXISTS, username);

  	if (exists.rowCount === 0) {
  	  const ADD_USER = 'INSERT INTO users (username, password) VALUES ($1, $2)';
  	  let hashedPass = bcrypt.hashSync(password, 10);
  	  let newUser = await dbQuery(ADD_USER, username, hashedPass);
  	  return true;
  	}

  	return false;
  }

  // external API call
  async getFdcId(foodItem) {
  	let searchPath = `https://api.nal.usda.gov/fdc/v1/foods/search?`;
  	let query = `query=%22${foodItem}%22&dataType=Foundation,Survey%20%28FNDDS%29,SR%20Legacy&pageSize=10&api_key=${config.API_KEY}`;
  	let response = await fetch(searchPath + query);
  	let food = await response.json();
  	return food.foods; // returns array of results, let user choose in index.js
  }

  // external API call
  async getFoodNutrients(fdcId) {
  	// let fdcId = await this.getFdcId(foodItem);
  	let path2 = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?`;
  	let query2 = `nutrients=203,204,205,208,291&api_key=${config.API_KEY}`;
  	let response2 = await fetch(path2 + query2);
  	let nutrients = await response2.json();
  	// console.log(Object.keys(nutrients));
  	console.log(nutrients.foodNutrients);
  	return nutrients;
  }
}
