const getDb         = require('../util/database').getDb;
const mongodb       = require('mongodb');

const objectId      = mongodb.ObjectId;

class User {
    constructor(username,email,cart,id){
        this.username   = username;
        this.email      = email;
        this.cart       = cart;
        this._id        = id;
    }

    save() {
        const db = getDb();
        return db.collection('users')
            .insertOne(this)
            .then(result => console.log(result))
            .catch(err => console.log(err));
    }

    addToCart(product){
        const cartProduct   = this.cart.items.find(cartProd => {
            return cartProd.productId.toString() === product._id.toString();
        });

        let updatedCartItems = [...this.cart.items];

        if(cartProduct){
            cartProduct.quantity += 1;
        }
        else {
            updatedCartItems.push({
                productId: new objectId(product._id),
                quantity: 1
            });
        }

        const updatedCart  = {items: updatedCartItems};
        const db            = getDb();

        return db.collection('users')
            .updateOne(
                {_id:new objectId(this._id)},
                {$set: {cart:updatedCart}}
            );
    }

    getCart(){
        const db = getDb();
        const productIds = this.cart.items.map(item => {
            return item.productId;
        });
        return db.collection('products')
            .find({_id: { $in : productIds} })
            .toArray()
            .then(products => {
                return products.map(product =>{
                    return {
                        ...product,
                        quantity: this.cart.items.find(item =>{
                            return item.productId.toString() === product._id.toString();
                        }).quantity
                    };
                });
            });
    }

    deleteItemFromCart(prodId){
        const updatedCartItems = this.cart.items.filter(item => {
            return item.productId.toString() !== prodId.toString();
        });

        const db = getDb();

        return db.collection('users')
            .updateOne({_id: new objectId(this._id)},
                {$set : {cart: {items: updatedCartItems } } } 
            );

    }

    static findByPk(prodId){
        const db = getDb();
        return db.collection('users')
            .findOne({_id: new objectId(prodId) })
            .then(product => {
                // console.log(product);
                return product
            })
            .catch(err => console.log(err));
    }

    addOrder() {
        const db = getDb();
        return this.getCart()
            .then( products => {
                const order = {
                    items: products,
                    user: {
                        _id : new objectId(this._id),
                        name: this.username
                    }
                };
                return db.collection('orders')
                    .insertOne(order);
            })
            .then(result => {
                this.cart = [];
                return db.collection('users')
                    .updateOne({_id: new objectId(this._id)},
                    {$set : {cart: {items: [] } } } 
                );
            })
    }

    getOrders(){
        const db = getDb();
        return db.collection('orders')
            .find({'user._id': new objectId(this._id)})
            .toArray();
    }
}

module.exports = User;