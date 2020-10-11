const {validationResult} = require('express-validator');

const Product = require('../models/product');
const fileUtil = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    oldInput: {
      title: '',
      price: '',
      description: '',
      imageUrl: '',
      userId: ''
    },
    validationErrors: [],
    errorMessage: ''
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if(!image){
    return res.status(422).render('admin/edit-product',{
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      oldInput: {
        title: title,
        price: price,
        description: description,
        userId: req.session.user
      },
      errorMessage: 'Attached file is not image.',
      validationErrors: []
    })
  }

  const imageUrl = image.path;
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product',{
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      oldInput: {
        title: title,
        price: price,
        description: description,
        userId: req.session.user
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    })
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.session.user,
  });
  product
    .save()
    .then(()=> {
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if(!product){
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: true,
        hasError: false,
        oldInput: {
          title: product.title,
          price: product.price,
          description: product.description,
          imageUrl: product.imageUrl,
          userId: req.session.user
        },
      errorMessage: null,
      validationErrors: [],
      product: product
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product',{
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      oldInput: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        userId: req.session.user
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      product:{
        _id: prodId
      } 
    })
  }
  
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/');
      }
      product.title = updatedTitle;
      if(updatedPrice){
        product.price = updatedPrice;
      }
      product.description = updatedDesc;
      if(image){
        fileUtil.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save()
    })
    .then(result => {
      console.log(result);
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({
    // userId: req.user._id
  })
    // .select('title desc')
    // .populate('userId')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if(!product){
        return next(new Error('Product not found.'));
      }
      fileUtil.deleteFile(product.imageUrl);
      return Product.deleteOne({
        _id: prodId,
        userId: req.user._id
      });
    })
    .then(()=>{
      console.log('Deleted Successfully');
      res.status(200).json({message: 'Delete product successfully'});
    })
    .catch(err => {
      res.status(500).json({message: 'Delete product failed'});
    });
};
