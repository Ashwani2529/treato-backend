
const { ErrorHandler } = require('../utills/errorHandler')
const { blogModel } = require('../models/blogModel')

const createBlog = async (req, res, next) => {
  try {
    if (!req.files) {
      throw new ErrorHandler("No Blog Image given!!", 400);
    }
    const existingBlog = await blogModel.findOne({ blog_name: req.body.blog_name });
    if (existingBlog) {
      throw new ErrorHandler("Blog already exists", 409);
    }

    const {
      blog_name,
      blog_main_title,
      writer_name,
      blog_description,
      blog_details,
      visiting_time,
      time_for_read_blog,
      social_media_url,
    } = req.body;

    let parsedBlogDetails;
    try {
      parsedBlogDetails = JSON.parse(blog_details);
      if (!Array.isArray(parsedBlogDetails)) {
        throw new Error();
      }
    } catch (err) {
      throw new ErrorHandler("Invalid Syntax of Blog Details!!", 400);
    }

    if (!req.files) {
      throw new ErrorHandler("Please Provide Images!!", 400);
    }

    const blogDetails = parsedBlogDetails.map((blog, index) => {
      const newBlog = { ...blog };
      newBlog.sub_blog_imag = {
        key: req.files.sub_blog_imag[0].key,
        public_url: req.files.sub_blog_imag[0].location
      };
      return newBlog;
    });

    const newBlog = await blogModel.create({
      blog_name,
      blog_main_title,
      writer_name,
      blog_description,
      blog_profile_img: {
        public_url: req.files.blog_profile_img[0].location,
        key: req.files.blog_profile_img[0].key,
      },
      blog_main_img: {
        key: req.files.sub_blog_imag[0].key,
        public_url: req.files.sub_blog_imag[0].location
      },
      blog_details: blogDetails,
      time_for_read_blog,
      visiting_time,
      social_media_url
    });

    res.status(201).json({
      success: true,
      message: 'Blog Created Successfully',
      data: newBlog
    });
  } catch (err) {
    next(err);
  }
};

const listBlog = async (req, res, next) => {
  try {

    const projection = {
      blog_Img: 1,
      writer_name: 1,
      blog_title: 1,
      blog_description: 1
    }

    const blogs = await blogModel.find().sort({ created: -1 }).select(projection);
    res.status(200).json({
      success: true,
      blogs
    })
  } catch (error) {
    next(err)
  }
};


const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Find the service by ID and remove it from the database
    const deletedBlog = await blogModel.deleteOne({ _id: id });

    if (!deletedBlog) {
      throw new ErrorHandler("Blog not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully"
    });
  } catch (err) {
    next(err)
  }
};

const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { blog_name,
      blog_title,
      writer_name,
      visiting_time,
      social_media_url } = req.body;

    // Check if the service exists
    const blog = await blogModel.findById(id);
    if (!blog) {
      throw new ErrorHandler("Blog not found", 404);
    }
    // Update service information
    blog.blog_name = blog_name;
    blog.blog_title = blog_title;
    blog.writer_name = writer_name,
      blog.visiting_time = visiting_time,
      blog.social_media_url = social_media_url

    // Check if a new image file was provided in the request
    if (req.file) {
      // Update the service's image details
      blog.blog_Img.public_url = req.file.location;
      blog.blog_Img.key = req.file.key;
    }

    // Save the updated service
    const updatedBlog = await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (err) {
    next(err)
  }
};

const getOneBlog = async (req, res, next) => {
  try {
    const blog = await blogModel.find({ _id: req.params.id })

    if (!blog) {
      throw new ErrorHandler('Blog Not Found!')
    }

    res.send({
      success: true,
      data: blog
    })
  } catch (err) {
    next(err)
  }
}



module.exports = {
  createBlog,
  listBlog,
  getOneBlog,
  deleteBlog,
  updateBlog
};
