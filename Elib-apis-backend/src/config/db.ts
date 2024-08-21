import mongoose from "mongoose";
import { config } from "./config";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Connected to Database Successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.log("Error in connecting to database", err);
    });

    await mongoose.connect(config.databaseURL as string);
  } catch (error) {
    console.log("Failed in connecting to Database: ", error);
    process.exit(1);
  }
};

export default connectDB;
