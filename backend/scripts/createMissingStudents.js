// scripts/createMissingStudents.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {});

  const students = await Student.find().select('userId');
  const existing = new Set(students.map(s => String(s.userId)));

  const users = await User.find({ role: 'student' });
  let created = 0;

  for (const u of users) {
    if (!existing.has(String(u._id))) {
      await Student.create({ userId: u._id });
      created++;
      console.log('Created Student doc for user', u.email || u._id);
    }
  }

  console.log('Migration done. Created:', created);
  mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
