const express = require('express');
const {check,body} = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

// // /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', isAuth,[
    body('title','Title only use alphabet numeric and password length min 3')
        .isString()
        .isLength({min:3}),
    body('image')
        .trim(),
        // .isURL(),
    body('price')
        .isFloat(),
    body('description')
        .isLength({min:5})
], adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', isAuth,
    [
        body('title','Title only use alphabet numeric and length min 3')
            .isString()
            .isLength({min:3}),
        body('imageUrl')
            .trim(),
            // .isURL(),
        body('price')
            .isFloat(),
        body('description')
            .isLength({min:5})
    ]
, adminController.postEditProduct);

module.exports = router;
