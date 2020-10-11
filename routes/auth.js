const express = require('express');
const {check,body} = require('express-validator');
const bcrypt =require('bcryptjs');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/signup',authController.getSignup);

router.post('/signup', 
[
    check('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .custom((value,{req}) => {
        // if(value === 'test@test.com'){
        //     throw new Error('This email is forbidden');
        // }
        // return true;
        return User.findOne({email: value})
            .then(user => {
                if(user){
                    return Promise.reject('Email has already picked up, please choose another email!');
                }
            });
    })
    .normalizeEmail(),
    body('password', 'Please enter a password only with text or numbers and at least 5 characters and maximum is 25.')
    .isLength({min:5,max:25}).isAlphanumeric().trim(),
    body('confirmPassword').custom((value,{req}) => {
        if(value !== req.body.password){
            throw new Error('Password have to match.');
        }
        return true;
    })
    .trim(),
], authController.postSignup);

router.get('/login',authController.getLogin);

router.post('/login',
[
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom( (value,{req}) => {
            return User.findOne({email: value})
                .then( user => {
                    if(!user){
                        return Promise.reject('Please enter an exist email.');
                    }
                });
        }),
    body('password')
        .isLength({min:5})
        .withMessage('Wrong Password!')
],authController.postLogin);

router.post('/logout',authController.postLogout);

router.get('/reset-password',authController.getReset);
router.post('/reset-password',authController.postReset);

router.get('/reset-password/:token', authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;