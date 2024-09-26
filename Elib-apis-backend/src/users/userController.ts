import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;
  //validation
  //Validation can be much more complex
  //We also need to do sanitization, library - Express validator
  if (!name || !email || !password) {
    const error = createHttpError(400, "All field are required");
    return next(error);
  }

  //Database call to check if there exists the same email or not
  const user = await userModel.findOne({ email: email });
  if (user) {
    const error = createHttpError(400, "User already exists with this email");
    return next(error);
  }

  //process
  //response
  res.json({ message: "User is created" });
};

export { createUser };
