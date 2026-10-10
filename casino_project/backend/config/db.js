const mongoose = require("mongoose");

async function connectDatabase() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB kapcsolat létrejött: ${connection.connection.host}`);
  } catch (error) {
    console.error("A MongoDB-kapcsolat sikertelen:", error.message);
    process.exit(1);
  }
}

module.exports = connectDatabase;
