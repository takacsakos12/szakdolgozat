const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API működik");
});

app.listen(5000, () => {
  console.log("Server fut 5000 porton");
});