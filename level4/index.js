import express from "express";
import dotenv from "dotenv";
dotenv.config();
// import {} from "@langchain/core";
import { ChatGroq } from "@langchain/groq";
const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

///here created model
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: 50,
  maxRetries: 2,
});

app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const response = await model.invoke([
    {
      role: "system",
      content: `You are a assistent and your name is jarvis.
      If you don't know the answer then don't give incorrect answer`,
    },
    { role: "human", content: input },
  ]);
  return res.status(200).json({ ai: response.content });
});

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Home route is working" });
});

app.listen(port, () => {
  console.log(`server is listing port at ${port}`);
});
