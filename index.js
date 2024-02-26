const path = require('path');
const fs = require('fs');


const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI =
  'mongodb://127.0.0.1:27017/myDatabase';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();


app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
var storage=multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,'images');
  },
  filename:function(req,file,cb){
    cb(null,file.fieldname+"-"+Date.now()+path.extname(file.originalname));
  }
})
 
app.use((req,res,next)=>{
  let upload=multer({
    storage:storage,
    fileFilter:(req,file,cb)=>{
      try{
        if(file.mimetype=="image/png" || file.mimetype=="image/jpg"||file.mimetype=="image/jpeg"){
          cb(null,true);
        }
        else{
          throw err;
        }
      }
      catch(e){console.log('error here');}
    }
  }).single("image");
 
  upload(req,res,async function(err){
    if(err){
      throw err
    }
    else{
      next()
    }
  })
});


app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {

  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

// app.use((error, req, res, next) => {
//   res.status(500).render('500', {
//     pageTitle: 'Error!',
//     path: '/500',
//     isAuthenticated: req.session.isLoggedIn
//   });
  
// });

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    console.log('server started on 3000');
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
