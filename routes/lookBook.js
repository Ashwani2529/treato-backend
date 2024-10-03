const express = require('express');
const routes = express.Router();
const { uploadImg } = require('../utills/fileUpload')
const { addLookBookImage, getAllLookBook, getOneLookBook, editLookBookImage,
    deleteLookBookImage, searchDataOnCategory, searchDataOnLocation
    , getAllLookbookLocations, searchLookbooks, searchLookbooksNearUser } = require("../controllers/lookBookController");

routes.route('/new').post(uploadImg.single("file"), addLookBookImage);
routes.route('/view-all').get(getAllLookBook);
routes.route('/view/:id').get(getOneLookBook);
routes.route('/edit/:id').patch(uploadImg.single("file"), editLookBookImage);
routes.route('/delete/:id').delete(deleteLookBookImage);
routes.route('/search').get(searchDataOnCategory);
routes.route('/location-search').get(searchDataOnLocation);

//get All location of lookbook
routes.route('/getLookbookLocation').get(getAllLookbookLocations);

//search Look Book
routes.route('/search/lookbook').get(searchLookbooks);

//search Look book near user
routes.route('/searchLookbooksNearUser').get(searchLookbooksNearUser);

module.exports = routes;
