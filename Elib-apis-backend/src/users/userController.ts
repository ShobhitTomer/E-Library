import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;
  //validation
  //Validation can be much more complex
  //We also need to do sanitization, library - Express validator
  if (!name || !email || !password) {
    const error = createHttpError(400, "All field are Required");
    return next(error);
  }
  //process
  //response
  res.json({ message: "User is created" });
};

export { createUser };
