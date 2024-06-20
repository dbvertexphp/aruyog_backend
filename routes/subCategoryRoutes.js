const express = require("express");
const { Createcategory, GetAllCategories, DeleteCategory, GetSingleCategoryByName, GetAllCategoriesAdmin, UpdateCategory, GetAllCategoriesAdminpage } = require("../controllers/categoryControllers.js");
const protect = require("../middleware/authMiddleware.js");
const { createSubcategory } = require("../controllers/subCategoryController.js");

const subCategoryRoutes = express.Router();

subCategoryRoutes.route("/createSubCategory").post(protect, createSubcategory);
subCategoryRoutes.route("/UpdateCategory").post(protect, UpdateCategory);
subCategoryRoutes.route("/").get(GetAllCategories);
subCategoryRoutes.route("/GetAllCategoriesAdmin").get(GetAllCategoriesAdmin);
subCategoryRoutes.route("/GetAllCategoriesAdminpage").post(GetAllCategoriesAdminpage);
subCategoryRoutes.route("/GetCategoryByName").post(GetSingleCategoryByName);
subCategoryRoutes.route("/DeleteCategory").post(protect, DeleteCategory);

module.exports = { subCategoryRoutes };
