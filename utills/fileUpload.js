const { DeleteObjectCommand,S3Client } = require("@aws-sdk/client-s3");
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { config } = require('dotenv');

config({
  path: "./config/config.env"
});

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_CLIENT,
    secretAccessKey: process.env.AWS_SECRET_KEY_CLIENT,
    
  },
  region: "ap-south-1",
  endpoint: "https://s3.ap-south-1.amazonaws.com"
});

// Default config for uploading to S3
const multerS3DefaultConfig = multerS3({
  bucket: process.env.AWS_BUCKET_NAME_CLIENT,
  s3: s3,
  metadata: function (req, file, callback) {
    callback(null, { fieldName: file.fieldname });
  },
  key: function (req, file, callback) {
    callback(null, `productImg-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Upload image using S3
exports.uploadImg = multer({
  storage: multerS3DefaultConfig,
  fileFilter: function (req, file, callback) {
    if (file.mimetype === "image/png" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/svg+xml" ||
      file.mimetype === "image/jpg") {
      callback(null, true);
    } else {
      callback(new Error("Invalid File Type!!"));
    }
  }
});

exports.replaceImg = multer({
  storage: multerS3DefaultConfig,
  fileFilter: function (req, file, callback) {
    if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/svg+xml' ||
      file.mimetype === 'image/jpg'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Invalid File Type!!'));
    }
  },
});
// Delete Image Function
exports.deleteImg = (imageKey, callback) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME_CLIENT,
    Key: imageKey
  };
  s3.send(new DeleteObjectCommand(deleteParams))
    .then(() => {
      callback(null);
    })
    .catch((error) => {
      callback(error);
    });
};

exports.uploadPDF = multer({
  storage: multerS3DefaultConfig,
  fileFilter: function (req, file, callback) {
    if (file.mimetype === 'application/pdf') {
      // Accept PDF files
      callback(null, true);
    } else {
      // Reject other file types
      callback(new Error('Invalid File Type!!'));
    }
  }
});