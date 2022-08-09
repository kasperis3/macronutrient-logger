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

  async addFood(fdcId, name, protein, net_carb, fat) {
  	const ADD = 'INSERT INTO food_stuffs (fdcId, name, protein, net_carb, fat) VALUES ($1, $2, $3, $4, $5)';

  	let result = await dbQuery(ADD, fdcId, name, protein, net_carb, fat);

  	return result.rowCount > 0;

  }

  async searchAndDestroy(foodItem) {
  	console.log(foodItem);
  	let searchPath = `https://api.nal.usda.gov/fdc/v1/foods/search?`;
  	let query = `query=%22${foodItem}%22&dataType=SR%20Legacy&pageSize=1&api_key=${config.API_KEY}`;
  	let response = await fetch(searchPath + query);
  	let food = await response.json();
  	console.log(Object.keys(food));
  	// console.log(food.foods[0].foodNutrients);
  	console.log(food.foods[0].fdcId);
  	let fdcId = food.foods[0].fdcId;
  	let path2 = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?`;
  	let query2 = `nutrients=203,204,205,208,291&api_key=${config.API_KEY}`;
  	let response2 = await fetch(path2 + query2);
  	let nutrients = await response2.json();
  	// console.log(Object.keys(nutrients));
  	console.log(nutrients.foodNutrients);
  	return nutrients;
  }
}
