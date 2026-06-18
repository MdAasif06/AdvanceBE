import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.get("/", (req, res) => {
  return res.status(200).json({ messsage: "Hello from docker phase 2" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`server is running port at ${port}`);
});
