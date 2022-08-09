CREATE TABLE users (
  username text PRIMARY KEY,
  password text NOT NULL
);

CREATE TABLE food_stuffs (
  id serial PRIMARY KEY,
  fdcId int NOT NULL UNIQUE, 
  name text NOT NULL,
  protein numeric NOT NULL,
  net_carb numeric NOT NULL,
  fat numeric NOT NULL
);

CREATE TABLE user_eats (
  food_id int NOT NULL REFERENCES food_stuffs(id) ON DELETE CASCADE,
  username text NOT NULL,
  "date" date DEFAULT CURRENT_DATE
);

