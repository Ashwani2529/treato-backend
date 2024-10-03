const express = require('express');
const routes = express.Router();

// Import service controller methods
const {
    createServices,listServices,searchServices,deleteService,updateService,getOneService,
    getServiceNameSuggestions,deleteSubCategory,deleteCategory,addNewCategory,
    editCategory,addNewSubcategory,editSubCategory
} = require('../controllers/serviceController');

// Import middleware for JWT verification
const { verifySalon } = require('../middlewares/jwtVerification');

// Import file upload utility
const { uploadImg } = require('../utills/fileUpload');

// Define routes for service operations
routes.route('/new').post(verifySalon, uploadImg.single("service_img"), createServices); // Route to create a new service
routes.route('/list').get(listServices); // Route to list all services
routes.route('/search').get(searchServices); // Route to search services
routes.route('/deleteService/:id').delete(deleteService); // Route to delete a service
routes.route('/updateService/:id').patch(verifySalon, uploadImg.single("service_img"), updateService); // Route to update a service
routes.route('/:id').get(getOneService); // Route to get details of a service by ID
routes.route('/suggestion').get(getServiceNameSuggestions); // Route to get service name suggestions

routes.route('/addNewCategory').patch(verifySalon, addNewCategory); // Route to add a new category
routes.route('/addNewSubcategory').patch(verifySalon, addNewSubcategory); // Route to add a new subcategory
// Routes to delete subcategory and category
routes.route('/deleteSubCategory/:serviceId/:mainCategoryId/:subCategoryId').delete(verifySalon, deleteSubCategory);
routes.route('/deleteCategory/:serviceId/:mainCategoryId').delete(verifySalon, deleteCategory);

// Route to update subcategory and category
routes.route('/editCategory').patch(verifySalon, editCategory);
routes.route('/editSubCategory').patch(verifySalon, editSubCategory);

module.exports = routes;
