import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userModel from "./models/user.model.js";
import Redis from "ioredis";
import rateLimiter from "./middleware/rateLimited.js";
import sendEmail from "./config/sendEmail.js";
import emailQueue from "./queue.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

export const redis = new Redis(process.env.REDIS_URL);
console.log("REDIS_URL =", process.env.REDIS_URL);


app.get("/", (req, res) => {
  return res.status(200).json({ messsage: "Hello from docker in redis" });
});

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body;
  await redis.del("user:all");
  const user = await userModel.create({
    name,
    email,
    password,
  });
 
  await emailQueue.add("send-email",{email})
  // await sendEmail()
  return res.json(user);
});
///without redis take time to data 75-163ms
app.get("/get",rateLimiter ,async (req, res) => {
  const user = await userModel.find({});

  return res.json(user);
});

app.get("/redis-get", async (req, res) => {
  const cached = await redis.get("user:all");
  if (cached) {
    const user = JSON.parse(cached);
    return res.json(user);
  }

  const user = await userModel.find({});
  await redis.set("user:all", JSON.stringify(user));

  return res.json(user);
});

app.post("/otp-send", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${email}`, otp, "EX", 30 );
  return res.json(otp);
});

app.post("/verify-otp", async (req, res) => {
  const { email,otp } = req.body;

  const cachedotp = await redis.get(`otp:${email}`);
  if (!cachedotp) {
    return res
      .status(400)
      .json({ message: "otp not found or has been expired" });
  }
  if (cachedotp != otp) {
    return res.status(400).json({ message: "incoorect otp" });
  }

  return res.json({ message: "otp varified" });
});

app.listen(port, () => {
  connectDB();
  console.log(`server is running port at ${port}`);
});
