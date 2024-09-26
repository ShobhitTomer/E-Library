import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";

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

  //Password hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await userModel.create({
    name,
    email,
    password: hashedPassword,
  });

  //process

  //Token Generation JWT
  const token = sign({ sub: newUser._id }, config.jwtSecret as string, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

  //response
  res.json({ id: newUser._id, accessToken: token });
};

export { createUser };
