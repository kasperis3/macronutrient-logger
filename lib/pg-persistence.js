const config = require('./config');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = class PgPersistence {
  constructor() {

  }

  async searchAndDestroy(foodItem) {
  	let path = `https://api.nal.usda.gov/fdc/v1/foods/search?`;
  	let query = `query=${foodItem}%20raw&dataType=&pageSize=1&sortOrder=asc&api_key=${config.API_KEY}`
  	let response = await fetch(path + query);
  	let food = await response.json();
  	console.log(food);
  	console.log(Object.keys(food));
  	console.log(food.foods[0].foodNutrients);
  }
}
