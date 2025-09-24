const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose")
const User = require('./models/User')
const Exercise = require('./models/Exercise')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    const user = new User({ username });
    await user.save();

    res.json({
      username: user.username,
      _id: user._id
    })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').exec();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    
    if (!description || !duration) {
      return res.status(400).json({ error: 'description and duration are required.' })
    }

    const durNum = parseInt(duration);
    if (isNaN(durNum)) {
      return res.status(400).json({ error: 'duration must be a number.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'user not found' });

    let exerciseDate;
    if (date) {
      exerciseDate = new Date(date);
      if (isNaN(exerciseDate.getTime())) {
        return res.status(400).json({ error: 'invalid date format.' });
      }
    } else {
      exerciseDate = new Date();
    }

    const exercise = new Exercise({
      userId: user._id,
      description: description,
      duration: durNum,
      date: exerciseDate
    });

    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }  
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const filter = { userId: user._id };

    if (from || to) {
      filter.date = {}
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) filter.date.$lte = toDate;
      }
    }

    let query = Exercise.find(filter).sort({ date: 'asc' });
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})