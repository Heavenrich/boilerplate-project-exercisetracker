const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.connect(process.env.MONGO_URI);

const exerciseSchema = new mongoose.Schema({
  userId: {type: mongoose.ObjectId, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date
}, {versionKey: false});
const Exercise = mongoose.model("Exercise", exerciseSchema);

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
}, {versionKey: false});
const User = mongoose.model("User", userSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

async function createUser(userName, done) {
  try {
    let data = await User.create({username: userName});
    done(null, data);
  } catch (err) {
    done(err);
  }
}

async function createExercise(id, description, duration, date, done) {
  try {
    let user = await User.findById(id);
    let dateObj = new Date();
    if (date) {
      dateObj = new Date(date);
      if (isNaN(dateObj)) {
        return done({message: 'Invalid Date'});
      }
    }
    if (isNaN(dateObj)) {
      dateObj = new Date();
      console.log(dateObj);
    }    
    result = await Exercise.create({userId: id, description: description, duration: duration, date: dateObj});
    data = {
      username: user.username,
      description: description,
      duration: duration,
      date: dateObj.toDateString(),
      _id: id
    }
    done(null, data);
  } catch (err) {
    done(err);
  }
}

async function getUsers(done) {
  try {
    let data = await User.find().exec();
    done(null, data);
  } catch (err) {
    done(err);
  }
}

async function getLogs(id, from, to, limit, done) {
  try {
    let user = await User.findById(id);
    let logs = []
    if (from) {
      from = new Date(from);
      if (to) {
        to = new Date(to);
        if (limit) {
          logs = await Exercise.find({userId: id, date: {'$gte': from, '$lte': to}}, null, {limit: limit});
        } else {
          logs = await Exercise.find({userId: id, date: {'$gte': from, '$lte': to}});
        }
      } else if (limit) {        
        logs = await Exercise.find({userId: id, date: {'$lte': to}}, null, {limit: limit});
      } else {
        logs = await Exercise.find({userId: id, date: {'$gte': from}});
      }
    } else if (to) {
      to = new Date(to);
      if (limit) {       
        logs = await Exercise.find({userId: id, date: {'$gte': from}}, null, {limit: limit});
      } else {               
        logs = await Exercise.find({userId: id, date: {'$lte': to}});
      }
    } else if (limit) {             
      logs = await Exercise.find({userId: id}, null, {limit: limit});
    } else {
      logs = await Exercise.find({userId: id});
    }
      
    logData = [];
    logs.forEach(log => {
      logData.push({
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString(),
      });
    });
    data = {
      username: user.username,
      count: logs.length,
      _id: id,
      log: logData      
    }
    done(null, data);
  } catch (err) {
    done(err);
  }
}


app.post('/api/users', (req, res, next) => {
  createUser(req.body.username, (err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }

    res.json(data);
  })
});



app.get('/api/users', (req, res, next) => {
  getUsers((err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }

    res.json(data);
  })
});

app.get('/api/users/:id/logs', (req, res, next) => {
  getLogs(req.params.id, req.query.from, req.query.to, req.query.limit, (err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }

    res.json(data);
  })
});

app.post('/api/users/:id/exercises', (req, res, next) => {
  createExercise(
    req.params.id, 
    req.body.description, 
    req.body.duration, 
    req.body.date, (err, data) => {
      if(err) {
        console.log(err);
        return next(err);
      }

      res.json(data)
  });
});

// Error handler
app.use(function (err, req, res, next) {
  if (err) {
    res
      .status(err.status || 500)
      .type("txt")
      .send(err.message || "SERVER ERROR");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
