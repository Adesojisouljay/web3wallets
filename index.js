import dotenv from "dotenv";
dotenv.config();

// Polyfill for Node 16 (Required for some crypto libraries)
import { webcrypto } from "crypto";
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

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

// Diagnostic Ping (No prefix)
app.get("/ping", (req, res) => res.json({
  success: true,
  message: "Server is alive on 4001",
  cwd: process.cwd(),
  time: new Date()
}));

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/api", routes);

// Catch-all logger for /api to see where it deviates
app.use("/api", (req, res) => {
  console.log(`[404 DEBUG] No route found for ${req.method} ${req.originalUrl}`);
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl} - Route not found on 4001 (Internal Logger)`);
});
// console.log("process.env.ETH_RPC_URLuuu;...",process.env.ETH_RPC_URL)

app.listen(4001, () => {
  console.log("Server running on port 4001");
  console.log("Working directory:", process.cwd());

  console.log("Working directory:", process.cwd());
});
