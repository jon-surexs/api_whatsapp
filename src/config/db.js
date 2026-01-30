// src/config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI no configurado. Saltando conexión a MongoDB.");
    return;
  }
  await mongoose.connect(uri);
  console.log("✅ MongoDB conectado.");
  console.log("MONGODB_URI usada:", process.env.MONGODB_URI);

}

module.exports = connectDB;
