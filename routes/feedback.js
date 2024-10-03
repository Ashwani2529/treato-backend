const routes = require("express").Router();
const { createReview } = require("../controllers/feedbackController");

routes.route('/create').post(createReview);

module.exports = routes;