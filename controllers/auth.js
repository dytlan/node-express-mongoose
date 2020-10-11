const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');
const {validationResult} = require('express-validator')

const User = require('../models/user');

const transporter = nodemailer.createTransport(mailgunTransport({
    auth:{
        api_key: '0fd9049357ba9f06cd21bd4401264c63-f7910792-f04c298f',
        domain: 'sandbox3f741f68b01242009aea8e0c25cd311d.mailgun.org'
    }
}));

exports.getSignup = (req,res,next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }
    else{
        message = null;
    }
    res.render('auth/signup',{
        path: '/signup',
        pageTitle: 'Sign Up',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationErrors: []
    });
}

exports.postSignup = (req,res,next) => {
    const email             = req.body.email;
    const password          = req.body.password;
    
    const errors            = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/signup',{
            path: '/signup',
            pageTitle: 'Sign Up',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email:email, password: password, confirmPassword: req.body.confirmPassword
            },
            validationErrors: errors.array()
        });
    }

        bcrypt.hash(password,12)
            .then( hashedPassword => {
                const user = new User({
                    email: email,
                    password: hashedPassword,
                    cart: { items:[] }
                });
                    return user.save();
                })
            .then( result => {
                res.redirect('/login');
                return transporter.sendMail({
                    to: email,
                    from: 'test@node-js.com',
                    subject: 'Signup Succeeded!',
                    html: '<h1> Sign Up Success</h1>'
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                  });
            });
}

exports.getLogin = (req,res,next)=>{
    // const isLoggedIn = req.get('Cookie').split(';')[1].trim().split('=')[1] === 'true';
    let message = req.flash('error');
    console.log(req.flash('error'));
    if(message.length > 0){
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login',{
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        validationErrors: [],
        oldInput: {
            email: '',
            password: ''
        }
    });
}

exports.postLogin = (req,res,next)=>{
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    let user;

    if(!errors.isEmpty()){
        return res.status(422).render('auth/login',
        {   
            path: '/signup',
            pageTitle: 'Sign Up',
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
            oldInput:{
                email:email,
                password: password,
            }
        })
    }

    User.findOne({email: email})
    .then( userDoc =>{
        user = userDoc;
        return bcrypt.compare(password,user.password);
    })
    .then( result => {
        if(result){
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save( err => {
                console.log(err);
                res.redirect('/');
            });
            }
        res.redirect('/login');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });

}

exports.postLogout = (req,res,next) => {
    req.session.destroy( err => {
        console.log(err);
        res.redirect('/');
    });
}

exports.getReset  = (req,res,next) => {
    let message = req.flash('error');
    console.log(message);
    if(message.length > 0){
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/reset',{
        pageTitle: 'Reset Page',
        path: '/reset-password',
        errorMessage: message
    });
}

exports.postReset = (req,res,next) => {
    crypto.randomBytes(32,(err,buffer) => {
        if(err){
            console.log(err);
            return res.redirect('/reset-password');
        }

        const email = req.body.email;
        const token = buffer.toString('hex');
        User.findOne({
            email: email
        })
            .then( user => {
                if(!user){
                    req.flash('error','No user exist with that email');
                    return res.redirect('/reset-password');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                transporter.sendMail({
                    from: 'test@node.js.com',
                    to: email,
                    subject: 'Reset Password',
                    html: `
                        <p> You request a password reset </p>
                        <p> Click this button for reset password </p>
                        <a href="http://localhost:3000/reset-password/${token}"><button type="button"> Click Here</button></a>
                    `
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
              });

    })
}

exports.getNewPassword = (req,res,next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: {$gt: Date.now()}
    })
        .then( user => {
            if(!user){
                return res.redirect('/reset-password');
            }
            let message = req.flash('error');
            if(message.length > 0){
                message = message[0];
            }
            else {
                message = null;
            }
            res.render('auth/new-password',{
                pageTitle: 'New Password',
                errorMessage: message,
                path: '/new-password',
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });

}

exports.postNewPassword = (req,res,next) => {
    const newPassword   = req.body.password;
    const userId        = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
        .then( user => {
            resetUser = user;
            return bcrypt.hash(newPassword,12);
        })
        .then( hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save()
        })
        .then( result => {
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
}