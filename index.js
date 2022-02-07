
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const uuid = require("uuid");

//const methodOverride = require("method-override");
const app = express();
const mongoose = require("mongoose");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");

//Mongoose models
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Directors;



mongoose.connect("mongodb+srv://haksuly1:mongodb+srv://haksuly1:MongoDbAtlas1@cluster0.mf0aq.mongodb.net/myFlixDB?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });

//mongoose.connect("mongodb://localhost:27017/myFlixDB", { useNewUrlParser: true, useUnifiedTopology: true });

//const db_url = process.env.CONNECTION_URI || "mongodb+srv://haksuly1:MongoDbAtlas1@cluster0.mf0aq.mongodb.net/myFlixDB?retryWrites=true&w=majority";
//mongoose.connect( db_url, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Use Cors
const cors = require("cors");
app.use(cors()); //This code requires CORS

//log requests to server
app.use(morgan("common"));

//Access-Control-Allow-Origin; 
// Use Express to return all static files in public folder
app.use(express.static("public"));
//app.use("/", express.static("public"));

//Authentication & Authorisation
let auth = require("./auth")(app); //Require and imports auth.js 
const passport = require("passport"); //Require and import passport.js
require("./passport");

app.get("/", (req, res) => {
res.send("Welcome to myFlix!");
});


//Get all movies with authentication - Mongoose Models
app.get("/movies", passport.authenticate("jwt", { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => { res.status(201).json(movies); })
    .catch((err) => { 
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});


// Get all users - Mongoose Models
app.get("/users", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.find()
    .then((users) => { res.status(201).json(users); })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    })
});

// Get a user by username - Mongoose Models
app.get("/users/:Username", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => { res.json(user); })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});

//GET JSON movie when looking for specific title - Mongoose Models
app.get("/movies/:Title", passport.authenticate("jwt", { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.Title })
  .then((movie) => { 
  res.json(movie);
})
.catch((err) => {
  console.error(err);
  res.status(500).send("Error: " + err);
});
});

//GET JSON genre info when looking for specific genre - Mongoose Models
app.get("/genre/:Name", passport.authenticate("jwt", { session: false }), (req, res) => {
  Movies.findOne({ "Genre.Name" : req.params.Name })
  .then((genre) => { res.json(genre.Description); })
.catch((err) => {
  console.error(err);
  res.status(500).send("Error: " + err);
});
});

//get info on director when looking for specific director - Mongoose Models
app.get("/director/:Name", passport.authenticate("jwt", { session: false }), (req, res) => {
  Movies.findOne({ "Director.Name": req.params.Name })
  .then((movie) => { res.json(movie); })
  .catch((err)  => {
    console.error(err);
    res.status(500).send("Error: " + err);
  });
});

//Allow users to register - Mongoose Models
app.post(
  "/users", [
    check("Username", "Username is required").isLength({ min: 5 }),
    check("Username", "Username contains non alphanumeric characters - not allowed.").isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + " already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

// Update a user's info, by username
app.put("/users/:Username", passport.authenticate("jwt", { session: false }),
    [
        check("Username", "Username is required").isLength({ min: 5 }),
        check("Username", "Username contains non alphanumeric characters - not allowed.").isAlphanumeric(),
        check("Password", "Password is required").not().isEmpty(),
        check("Email", "Email does not appear to be valid").isEmail()
    ], (req, res) => {

        // check the validation object for errors
        let errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
            {
                Username: req.body.Username,
                Password: req.body.Password,
                Email: req.body.Email,
                Birthday: req.body.Birthday
            }
        },
            { new: true }, // This line makes sure that the updated document is returned
            (err, updatedUser) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error: ' + err);
                } else {
                    res.json(updatedUser);
                }
            });
    });

//Add movie to user's favorite movie list
app.post("/users/:Username/movies/:MovieID", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
      $push: { FavoriteMovies: req.params.MovieID }
  },
      { new: true }, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
          if (err) {
              console.error(err);
              res.status(500).send("Error: " + err);
          } else {
              res.json(updatedUser);
          }
      });
});

//FETCH DOCUMENTATION PAGE
app.get("/documentation", passport.authenticate("jwt", { session: false }), (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
});

//Delete movie from user's favorite movie list
app.delete("/users/:Username/movies/:MovieID", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
      $pull: { FavoriteMovies: req.params.MovieID }
  },
      { new: true }, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
          if (err) {
              console.error(err);
              res.status(500).send("Error: " + err);
          } else {
              res.json(updatedUser);
          }
      });
});

//Delete user by username / Allow user to de-register
app.delete("/users/:Username", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
      .then((user) => {
          if (!user) {
              res.status(400).send(req.params.Username + " was not found");
          } else {
              res.status(200).send(req.params.Username + " was deleted.");
          }
      })
      .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
      });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("An error has been detected")
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0",() => {
 console.log("Listening on Port " + port);
});






