const {blogModel} = require('../models/blogModel')
const {ErrorHandler} = require('../errorHandlers/errorHandler.js')

const _createBlog = async (blogData ,req, res , next) => {
    try {
      const newBlog = await blogModel.create(blogData);
      await newBlog.save()
      res.status(200).json({
        success:true,
        message :'Blog Created Successfully'
      })
    } catch (error) {
      res.status(200).json({
        success:false
      })
    }
  };

  const _getBlogs = async (req,res , next) => {
    try {
      const blogs = await blogModel.find().sort({ created: -1 });

      if (!blogs) {
        throw new ErrorHandler("No Blog Found" , 400);
      }

      res.status(200).json({
        success:true,
        blogs
    })
    } catch (error) {
      next(error);
    }
  };

  module.exports ={
    _createBlog,
    _getBlogs
  }
