/* eslint-disable @typescript-eslint/no-unused-vars */
import path from "node:path";
import fs from "node:fs";
import { NextFunction, Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import bookModel from "./bookModel";

const createBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre } = req.body;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  //application/pdf - mimetype
  const coverImageMimeType = files.coverImage[0].mimetype.split("/").at(-1);
  const coverImageFileName = files.coverImage[0].filename;
  //This will generate a absolute path to the file
  const coverImageFilePath = path.resolve(
    __dirname,
    "../../public/data/uploads",
    coverImageFileName
  );

  try {
    const uploadResult = await cloudinary.uploader.upload(coverImageFilePath, {
      filename_override: coverImageFileName,
      folder: "book-covers",
      format: coverImageMimeType,
    });

    const bookFileName = files.file[0].filename;
    const bookFilePath = path.resolve(
      __dirname,
      "../../public/data/uploads",
      bookFileName
    );

    const bookFileUploadResult = await cloudinary.uploader.upload(
      bookFilePath,
      {
        resource_type: "raw",
        filename_override: bookFileName,
        folder: "book-pdfs",
        format: "pdf",
      }
    );

    console.log("BookuploadResult", bookFileUploadResult);
    console.log("uploadResult", uploadResult);

    const newBook = await bookModel.create({
      title,
      genre,
      author: "66f595e2d2937a5b111a8174",
      coverImage: uploadResult.secure_url,
      file: bookFileUploadResult.secure_url,
    });

    //delete temp files
    try {
      await fs.promises.unlink(coverImageFilePath);
      await fs.promises.unlink(bookFilePath);
    } catch (err) {
      return next(createHttpError(500, "Error while deleting the local files"));
    }

    res.status(201).json({ id: newBook._id });
  } catch (err) {
    console.log(err);
    return next(createHttpError(500, "Error while uploading the files"));
  }
};

export { createBook };
