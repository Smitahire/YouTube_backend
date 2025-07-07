import express from 'express';
import cors from 'cors';
import cookieParese from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({ limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParese())


// routes 
import userRoutre from "./routes/user.routes.js";

//routes declaration 
app.use("/api/v1/users", userRoutre) //http://localhost:8000/api/v1/users/register



export { app }