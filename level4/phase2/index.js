import express from "express";
import dotenv from "dotenv";
dotenv.config();
import {} from "@langchain/core";
import { ChatGroq } from "@langchain/groq";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";


const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

///here created model
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: 50,
  maxRetries: 2,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});


const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "grocery-store",
});

const upload = async () => {
  const pdfPath = "./knowledge.pdf";
  const buffer = fs.readFileSync(pdfPath);
  const pdfResult = new PDFParse({ data: buffer });
  const result = await pdfResult.getText();
  const text = result.text;
  const spiliter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await spiliter.createDocuments([text]);
  // console.log(docs);
  await vectorStore.addDocuments(docs)
};
upload();


app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const response = await llm.invoke(input);
  console.log(response);

  return res.status(200).json({ ai: response.content });
});

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Home route is working" });
});

app.listen(port, () => {
  console.log(`server is listing port at ${port}`);
});
