import express from "express";
import dotenv from "dotenv";
dotenv.config();
// import {} from "@langchain/core";
import { ChatGroq } from "@langchain/groq";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

const tool = new TavilySearch({
  maxResults: 2,
  topic: "general",
 
});

const tools = [tool];
const toolNode = new ToolNode(tools);


///here created model
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: 50,
  maxRetries: 2,
}).bindTools(tools);

const State = Annotation.Root({
  prompt: Annotation,
  aiMsg: Annotation,
});




const callLLM = async (state) => {
  console.log("state", state);
  const response = await model.invoke([
    {
      role: "system",
      content: `You are a assistent and your name is jarvis.
      If you don't know the answer then call relevent tool`,
    },
    // { role: "human", content: state.messages[0].content },
    ...state.messages
  ]);
  return { messages: [response] };
};

const shouldContinue = async (state) => {
  const lastMessage=state.messages[state.messages.length-1]
  if(lastMessage.tool_calls.length>0){
    return "tools"
  }else{
     return "__end__"
  }
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools","agent")
  .addConditionalEdges("agent",shouldContinue)
  // .addEdge("agent", "__end__")
  .compile();

app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const response = await graph.invoke({
    messages: [{ role: "user", content: input }],
  });
  console.log(response);

  return res.status(200).json({ ai: response.messages[response.messages.length-1].content });
});

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Home route is working" });
});

app.listen(port, () => {
  console.log(`server is listing port at ${port}`);
});
