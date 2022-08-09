const config = require('./config');
const { dbQuery } = require('./db-query');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = class PgPersistence {
  constructor() {

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
