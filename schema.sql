DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_eats;
DROP TABLE IF EXISTS food_stuffs;

CREATE TABLE users (
  username text PRIMARY KEY,
  password text NOT NULL
);

CREATE TABLE food_stuffs (
  id serial PRIMARY KEY,
  fdcId int NOT NULL UNIQUE, 
  name text NOT NULL,
  protein numeric NOT NULL,
  carbohydrate numeric NOT NULL,
  fiber numeric,
  fat numeric NOT NULL,
  "net carb" numeric
);

CREATE TABLE user_eats (
  food_id int NOT NULL REFERENCES food_stuffs(id) ON DELETE CASCADE,
  username text NOT NULL,
  portion_size numeric NOT NULL,
  "date" date DEFAULT CURRENT_DATE
);

