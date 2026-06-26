import express from "express"
import dotenv from "dotenv"
dotenv.config()

const port=process.env.PORT||5000
const app=express()

app.get("/",(req,res)=>{
    return res.status(200).json({message:"working home route"})
})
app.get("/hello",(req,res)=>{
    return res.status(200).json({message:"All are Good👍"})
})

app.listen(port,()=>{
    console.log(`server running at ${port}`)
})