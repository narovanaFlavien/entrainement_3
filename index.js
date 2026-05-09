import express from 'express';
import cors from 'cors';
import { config } from "dotenv";

config()
const PORT = process.env.SERVER_PORT;
const app = express()

app.use(cors());
app.use(express.urlencoded())
app.use(express.json())
app.use("/uploads", express.static("uploads"));

app.listen(PORT)