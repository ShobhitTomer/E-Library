/* eslint-disable @typescript-eslint/no-unused-vars */
import path, { resolve } from "node:path";
import fs from "node:fs";
import { NextFunction, Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import { AuthRequest } from "../middlewares/authenticate";

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

    const _req = req as AuthRequest;
    const newBook = await bookModel.create({
      title,
      genre,
      author: _req.userId,
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

const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre } = req.body;

  const bookId = req.params.bookId;

  const book = await bookModel.findOne({ _id: bookId });

  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }

  //Check access
  const _req = req as AuthRequest;
  if (book.author.toString() != _req.userId) {
    return next(createHttpError(403, "You cannot update other's books"));
  }

  //check if cover images exists or not
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  let completeCoverImage = "";
  if (files.coverImage) {
    const filename = files.coverImage[0].filename;
    const coverMimeType = files.coverImage[0].mimetype.split("/").at(-1);

    //Send files to cloudinary
    const filePath = resolve(__dirname, "../../public/data/uploads" + filename);
    completeCoverImage = filename;
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: completeCoverImage,
      folder: "book-covers",
      format: coverMimeType,
    });

    //Delete the old cover image from cloudinary through publicId
    const coverFileSplits = book.coverImage.split("/");
    const coverImagePublicId =
      coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);
    await cloudinary.uploader.destroy(coverImagePublicId);

    completeCoverImage = uploadResult.secure_url;
    await fs.promises.unlink(filePath);
  }

  //check if the file exists in the request
  let completeFileName = "";
  if (files.file) {
    const bookFileName = files.file[0].filename;
    const bookFilePath = path.resolve(
      __dirname,
      "../../public/data/uploads/" + bookFileName
    );
    completeFileName = bookFileName;

    const uploadBookResult = await cloudinary.uploader.upload(bookFilePath, {
      resource_type: "raw",
      filename_override: completeFileName,
      folder: "book-pdfs",
      format: "pdf",
    });

    //Delete the old pdf from cloudinary
    const pdfFileSplits = book.file.split("/");
    const filePublicId = pdfFileSplits.at(-2) + "/" + pdfFileSplits.at(-1);

    await cloudinary.uploader.destroy(filePublicId, {
      resource_type: "raw",
    });

    completeFileName = uploadBookResult.secure_url;
    await fs.promises.unlink(bookFilePath);
  }

  const updatedBook = await bookModel.findOneAndUpdate(
    {
      _id: bookId,
    },
    {
      title: title,
      genre: genre,
      coverImage: completeCoverImage ? completeCoverImage : book.coverImage,
      file: completeFileName ? completeFileName : book.file,
    },
    {
      new: true,
    }
  );
  res.json(updatedBook);
};

const listBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //Add pagination
    const book = await bookModel.find();
    res.json(book);
  } catch (err) {
    return next(createHttpError(500, "Error while getting the books"));
  }
};

const getSingleBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bookId = req.params.bookId;

  try {
    const book = await bookModel.findOne({ _id: bookId });
    if (!book) {
      return next(createHttpError(404, "Book not found"));
    }
    return res.json(book);
  } catch (err) {
    return next(createHttpError(500, "Error while getting the book"));
  }
};

const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;
  const book = await bookModel.findOne({ _id: bookId });
  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }
  //check access for the book
  const _req = req as AuthRequest;
  if (book.author.toString() != _req.userId) {
    return next(createHttpError(403, "You cannot delete other's books"));
  }

  //Making the public id to delete cloudinary
  const coverFileSplits = book.coverImage.split("/");
  const coverImagePublicId =
    coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);

  const pdfFileSplits = book.file.split("/");
  const filePublicId = pdfFileSplits.at(-2) + "/" + pdfFileSplits.at(-1);

  try {
    await cloudinary.uploader.destroy(coverImagePublicId);
    await cloudinary.uploader.destroy(filePublicId, {
      resource_type: "raw",
    });
    await bookModel.deleteOne({ _id: bookId });
  } catch (err) {
    return next(createHttpError(500, "Error in deleting the book"));
  }
  return res.sendStatus(204);
};

export { createBook, updateBook, listBooks, getSingleBook, deleteBook };
