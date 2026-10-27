// backend/createAdmin.js
// Run once:  node createAdmin.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI); // same variable name as in config/db.js

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    console.log("Admin already exists:", email);
  } else {
    await User.create({ name: "Admin", email, password, role: "admin" });
    console.log("Admin created:", email);
  }
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});