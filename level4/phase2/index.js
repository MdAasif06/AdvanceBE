import express from "express";
import dotenv from "dotenv";
dotenv.config();
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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
  await vectorStore.addDocuments(docs);
};
upload();

app.post("/ai", async (req, res) => {
  const { input } = req.body;

  const docOne = await vectorStore.similaritySearch(input, 5);
  // console.log(docOne)
  const context = docOne.map((d) => d.pageContent).join("/n");
  const response = await llm.invoke([
    new SystemMessage(`You are a RAG AI Asistent.
        STRICT RULE:
        - Answer only from context
        - Do not use outside knowledge
        - if answer not found say:
        "I don't know from uploaded PDF".
        Context:${context}`),
        new HumanMessage(input)
  ]);

  // console.log(response);

  return res.status(200).json({AI:response.content});
});

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Home route is working" });
});

app.listen(port, () => {
  console.log(`server is listing port at ${port}`);
});
