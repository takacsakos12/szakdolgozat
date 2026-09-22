require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

const port = process.env.PORT || 5000;
const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:3000";

app.use(helmet());

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Az API működik.",
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "A kért végpont nem található.",
  });
});

app.use((error, req, res, next) => {
  console.error("Szerverhiba:", error);

  res.status(500).json({
    message: "Váratlan szerverhiba történt.",
  });
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("A MONGODB_URI nincs beállítva a .env fájlban.");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("A JWT_SECRET nincs beállítva a .env fájlban.");
    process.exit(1);
  }

  await connectDatabase();

  app.listen(port, () => {
    console.log(`A szerver a ${port}-es porton fut.`);
  });
}

startServer();