import express from "express";
import cors from "cors";
import authRoutes from "./route/auth.route.js";
import connectRoutes from "./route/connect.route.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", connectRoutes);



app.get("/", (req, res) => {
  res.send("Server is running");
});

export default app;
