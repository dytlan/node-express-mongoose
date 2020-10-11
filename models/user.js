const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: 
            [{productId:{
                type: Schema.Types.ObjectId, 
                required:true,
                ref: 'Product'
            }, 
            quantity: {
                type: Number, 
                required: true
            }
            }]  
    }
});

userSchema.methods.addToCart = function(product) {
    const cartProduct = this.cart.items.find(cartProd => {
        return cartProd.productId.toString() === product._id.toString();
    });
    const updatedCartItems = [...this.cart.items];
    if(cartProduct){
        cartProduct.quantity += 1;
    }
    else {
        updatedCartItems.push({
            productId: product._id,
            quantity: 1
        });
    }
    const updatedCart = {items: updatedCartItems};
    this.cart = updatedCart;
    return this.save();
};

userSchema.methods.deleteItemFromCart = function(productId){
    const updatedCartItems = this.cart.items.filter(cartProduct => {
        return cartProduct.productId.toString() !== productId.toString();
    })
    this.cart.items = updatedCartItems;
    return this.save();
}

userSchema.methods.clearCart = function(){
    this.cart = {items: []};
    return this.save();
}

module.exports = mongoose.model('User',userSchema);