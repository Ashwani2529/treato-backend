const express = require('express');
const routes = express.Router();
const {listBlog , createBlog ,deleteBlog ,updateBlog , getOneBlog} = require('../controllers/blogsController')
const {uploadImg} = require('../utills/fileUpload')


const uploadFiles = uploadImg.fields([
  { name: 'sub_blog_imag', maxCount: 5 },
    { name: 'blog_profile_img', maxCount: 1 },
    { name: 'blog_main_img', maxCount: 1 },
  ]);

//Create Blog
routes.route('/new').post(uploadFiles, createBlog);

//list All the blogs
routes.route('/list').get(listBlog);

//delete Blog
routes.route('/deleteBlog/:id').delete(deleteBlog);

//update Blog
routes.route('/updateBlog/:id').patch(updateBlog);

//get One Blog
routes.route('/getBlog/:id').get(getOneBlog)

module.exports = routes;