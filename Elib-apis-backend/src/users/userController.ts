/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";
import { User } from "./userTypes";

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
  try {
    const user = await userModel.findOne({ email: email });
    if (user) {
      const error = createHttpError(400, "User already exists with this email");
      return next(error);
    }
  } catch (error) {
    return next(createHttpError(500, "Error while getting user"));
  }

  //Password hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  let newUser: User;

  try {
    newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });
  } catch (err) {
    return next(createHttpError(500, "Error while creating user"));
  }

  //process

  //Token Generation JWT

  try {
    const token = sign({ sub: newUser._id }, config.jwtSecret as string, {
      expiresIn: "7d",
      algorithm: "HS256",
    });
    //response
    res.status(201).json({ id: newUser._id, accessToken: token });
  } catch (err) {
    return next(createHttpError(500, "Error while signing the jwt token"));
  }
};

const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  //DB call to fetch the user
  let user;
  try {
    user = await userModel.findOne({ email });
  } catch (err) {
    return next(createHttpError(500, "Error while finding the user"));
  }

  if (!user) {
    return next(createHttpError(404, "User not found"));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(createHttpError(400, "Email or password incorrect"));
  }

  //Create access token
  const token = sign({ sub: user._id }, config.jwtSecret as string, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

  res.json({ accessToken: token });
};

export { createUser, loginUser };
