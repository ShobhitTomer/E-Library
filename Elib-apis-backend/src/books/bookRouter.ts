import express from "express";
import { createBook } from "./bookController";

const bookRouter = express.Router();

//api/books
bookRouter.post("/", createBook);

export default bookRouter;
