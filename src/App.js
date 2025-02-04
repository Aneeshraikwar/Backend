import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.get('/', (req, res) => {
  res.send('Hello Aneesh!')
})


app.listen( process.env.PORT || 8000, () => {
  console.log(`Server is running on port ${ process.env.PORT}`);
});
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

/* ---------------------------- import routes --------------------------- */
import userRouter from "./routes/router.js";

/* --------------------------- diclairation routes -------------------------- */
app.use("/api/v1/users", userRouter);
 export default app;
