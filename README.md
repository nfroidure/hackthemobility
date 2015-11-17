## API


Running the back:

```sh
npm start
```

### Auth:
- Facebook: GET localhost:3000/auth/facebook
- Login: POST username, password to localhost:3000/api/v0/login
- Logout: POST username, password to localhost:3000/api/v0/logout
- Signup: POST username, password, name to localhost:3000/api/v0/signup
- Profile: GET localhost:3000/api/v0/profile - redirection


Resource:
```js
{
  "username": "jojo@ledemago.com",
  "password": "notasecret", // Saved raw but don't give a shit
  "name": "Popol" // Singup only
}
```

# Users
- List: GET localhost:3000/api/v0/users
- Details: GET localhost:3000/api/v0/users/:user_id
- Add: PUT localhost:3000/api/v0/users/:user_id
- Delete: DELETE localhost:3000/api/v0/users/:user_id

Resource:
```js
{
  "contents": {
    "name": "Polo",
    "email": "Lalcolo",
    // + anything
  },
  "cars": [{
    "_id": "abbacacaabbacacaabbacaca",
    contents: {
      // anything
    },
  }],
}
```

# Trips
- List: GET localhost:3000/api/v0/users/:user_id/trips
- Details: GET localhost:3000/api/v0/users/:user_id/trips/:trip_id
- Add: PUT localhost:3000/api/v0/users/:user_id/trips/:trip_id
- Delete: DELETE localhost:3000/api/v0/users/:user_id/trips/:trip_id

Resource:
```js
{
"_id": 'abbacacaabbacacaabbacaca' // ObjectId stringifié et généré côté client
  "contents": {
    "_id": 'abba1a1aabba1a1aabba=caca1a1a' // ObjectId stringifié et généré côté client
    "name": "Mon trip à SF",
    "description": "",
    "from": {
        "address": "2, rue de la Haye du Temple 59000 Lille",
        "latLng": [0, 0],
    },
    "to": {
        "address": "72 avenue de Bretagne 59000 Lille",
        "latLng": [0, 0],
    },
    "tag": "yololille", // Pas de #
    "friends_ids": ['b17eb17eb17eb17eb17eb17e'],
    // anything
  },
  "owner_id": "babababababababababababa", // Id du propriétaire, ajouté par le serveur
}
```

# Events
- List: GET localhost:3000/api/v0/users/:user_id/events
- Details: GET localhost:3000/api/v0/users/:user_id/events/:event_id
- Add: PUT localhost:3000/api/v0/users/:user_id/events/:event_id
- Delete: DELETE localhost:3000/api/v0/users/:user_id/events/:event_id

Resource:
```js
{
"_id": 'abbacacaabbacacaabbacaca' // ObjectId stringifié et généré côté client
  "contents": {
    "type": "trip-start",
    "date": "2015-11-15T13:06:28.745Z" // new Date().toISOString() en JS
    "trip_id": 'abbacacaabbacacaabbacaca' // ObjectId stringifié et généré côté client
    // anything
  },
  "trip": { // Non nécessaire en écriture de le préciser
    "_id": 'abba1a1aabba1a1aabbacaca1a1a' // ObjectId stringifié et généré côté client
    "name": "Mon trip à SF",
    "description": "",
    // anything
  },
  "owner_id": "babababababababababababa", // Id du propriétaire, ajouté par le serveur
}
```

# Cars
- List: GET localhost:3000/api/v0/users/:user_id/cars
- Details: GET localhost:3000/api/v0/users/:user_id/cars/:car_id
- Add: PUT localhost:3000/api/v0/users/:user_id/cars/:car_id (soon)
- Delete: DELETE localhost:3000/api/v0/users/:user_id/cars/:car_id (soon)

Resource:
```js
{
  "_id": "564b2cabeec81a63aae5f4e8",
  "contents": {
    "_id": "564b2cabeec81a63aae5f4e8",
    "type": "psa",
    "vin": "XXXXXXXXXX",
    "contract": "XXXXXXXXXX",
    "code": "XXXXXXXXXX",
    "user_id": "XXXXXXXXXX"
  }
}
```
