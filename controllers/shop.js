const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments()
    .then(numProduct => {
      totalItems = numProduct;
      return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        hasPreviousPage: page > 1,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        previousPage: page - 1,
        nextPage: page + 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => console.log(err));
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then( product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments()
    .then( numProduct => {
        totalItems = numProduct;
        return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then( products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage : ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage : page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        //Math Ceil itu pembulatan
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => console.log(err));
};

exports.getCart = (req, res, next) => {

  req.user
    //Get All Cart item for specific user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
        res.render('shop/cart', {
          path: '/cart',
          pageTitle: 'Your Cart',
          products: products,
        });
      })
    .catch( err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then( product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log('SUCCESS');
      res.redirect('/cart');
    })
    .catch(err => console.log(err)); 
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteItemFromCart(prodId)
    .then( () => {
      res.redirect('/cart')
    })
    .catch( err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order
    .find({'user.userId' : req.user._id})
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Orders',
        orders: orders,
      });
    })
    .catch( err => console.log(err));
};

// exports.getCheckout = (req, res, next) => {
//   req.user
//     .getOrders()
//     .then(orders => {
//       res.render('shop/checkout', {
//         path: '/checkout',
//         pageTitle: 'Checkout',
//         orders: orders
//       });
//     })
//     .catch( err => console.log(err));
// };

exports.getCheckoutSuccess = (req,res,next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then( user =>{
      const products = user.cart.items.map(item => {
        return {product: {...item.productId._doc}, quantity: item.quantity};
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
      });
      return order.save();
    })
    .then(()=>{
      return req.user.clearCart();
    })
    .then( result => {
      res.redirect('/orders');
    })   
    .catch(err => console.log(err));
}

exports.getInvoice = (req, res, next) => {
  const invoice = req.params.orderId;
  Order.findById(invoice)
    .then(order => {
      if(!order){
        return next(new Error('No order found.'));
      }
      if(order.user.userId.toString() !== req.user._id.toString()){
        return next(new Error('Unauthorized'));
      }
      const invoiceName = 'invoice-'+invoice+ '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();

      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposisiton', `inline; filename= ${invoiceName}`);
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice',{
        underline: true,
      });
      pdfDoc.text('----------------------');
      let totalPrice = 0
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.fontSize(12).text(prod.product.title + ' - ' + prod.quantity + ' x ' + '$'+ prod.product.price);
      });
      pdfDoc.text('----------------------');
      pdfDoc.fontSize(15).text(`Total Price : ${totalPrice}`);
      pdfDoc.end();
      /* Pre Loading Data */
      // fs.readFile(invoicePath, (err, data)=> {
      //   if(err){
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', `inline; filename= ${invoiceName}`);
      //   res.send(data);
      // });

      /* Streaming Data */
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type','application/pdf');
      // res.setHeader('Content-Disposition',`inline; filename=${invoiceName}`);
      // file.pipe(res);
    })
    .catch( err => next(err));
    /* Download Data */
  // res.download(invoicePath, invoiceName);
}

exports.getCheckout = (req, res, next) => {
  let products;
  let total;
  req.user
    //Get All Cart item for specific user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      total = 0;

      products.forEach(product =>{
        total += product.quantity * product.productId.price;
      });

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(product => {
          return {
            name: product.productId.title,
            description: product.productId.description,
            amount: product.productId.price * 100,
            currency: 'usd',
            quantity: product.quantity
          };
        }),
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost/checkout/success
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel', // => http://localhost/checkout/cancel,
      })
      .then( session => {
        res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          totalSum: total,
          sessionId: session.id
        });
      })
      })
    .catch( err => console.log(err));
}
