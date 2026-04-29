require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function getEnv(name) {
  return String(process.env[name] || "").trim();
}

async function run() {
  const mongoUri = getEnv("MONGO_URI");
  const name = getEnv("SUPER_ADMIN_NAME");
  const email = getEnv("SUPER_ADMIN_EMAIL").toLowerCase();
  const password = getEnv("SUPER_ADMIN_PASSWORD");

  if (!mongoUri) {
    throw new Error("MONGO_URI is required in .env");
  }

  if (!name || !email || !password) {
    throw new Error("SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required in .env");
  }

  await mongoose.connect(mongoUri);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`Super Admin seed skipped. User already exists for email: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "super_admin",
    isActive: true,
    isApproved: true
  });

  console.log(`Super Admin created successfully: ${user.email}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed to create Super Admin:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // ignore close errors
  }
  process.exit(1);
});
