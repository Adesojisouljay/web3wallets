import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
// console.log("ALL ENV KEYS:", Object.keys(process.env));


const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use("/api", routes);
// console.log("process.env.ETH_RPC_URLuuu;...",process.env.ETH_RPC_URL)

app.listen(4001, () => console.log("Server running on port 4001"));
