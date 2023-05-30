require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const axios = require("axios");
const request = require('request');

// passport session
app.use(session({
    secret:process.env.SECRET, 
    resave: false,
    saveUninitialized: false
  }));
app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));

async function main() {
  // await mongoose.connect('mongodb://127.0.0.1:27017/blogWebSiteDB');
  await mongoose.connect("mongodb+srv://hilariousheisenberg:"+process.env.ATLASPASS+"@cluster0.mq31mxi.mongodb.net/blogWebsiteDB");


  // let response = await axios({
  //   method: 'get',
  //   url: 'https://api.api-ninjas.com/v1/quotes?category=',
  //   headers: {
  //         'X-Api-Key':process.env.NINJAAPIKEY
  //       }
  // });
  // var quoteForHome = response.data[0].quote;

  const reviewSchema = new mongoose.Schema({
    review:String,
    author:String
  });
  const Review = new mongoose.model("Review",reviewSchema);

  const blogSchema = new mongoose.Schema({
      title:String,
      body:String,
      reviews:[reviewSchema]
  });
  const Blog = mongoose.model("Blog",blogSchema);

  const userSchema = new mongoose.Schema({
    username:String,
    password:String,
    blogs:[blogSchema]
  });
  userSchema.plugin(passportLocalMongoose);
  const User = new mongoose.model("User",userSchema)

  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  const homeStartingContent="";
  const aboutContent = "Hello There! I am Vinayak. Third year engineering student at ABV-IIITM Gwalior.";
  const contactContent = "contact us";
 
  //function shuffle so that we will get to see posts in random orders
  function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }

  app.get("/", async function (req, res) {
    const posts = [];
    const users =  await User.find({blogs:{$ne:null}});

    users.forEach(u => {
      u.blogs.forEach(blog => {
        posts.push(blog);
      });
    });

    shuffle(posts);

    if (req.isAuthenticated()) {
      const userlog = req.user.username.substring(0, req.user.username.indexOf("@"));
      res.render("home", { Hcontent: homeStartingContent ,posts:posts,login:userlog});
    } 
    else{
      res.render("home", { Hcontent: homeStartingContent ,posts:posts,login:"LOG IN"});
    }
  });

  app.get("/about", function (req, res) {
    if (req.isAuthenticated()) {
      const userlog = req.user.username.substring(0, req.user.username.indexOf("@"));
      res.render("about", { Acontent: aboutContent ,login:userlog});
    } 
    else{
      res.render("about", { Acontent: aboutContent ,login:"LOG IN"});
    }
  });

  app.get("/contact", function (req, res) {
    if (req.isAuthenticated()) {
      const userlog = req.user.username.substring(0, req.user.username.indexOf("@"));
      res.render("contact", { Ccontent: contactContent,login:userlog });
  
    } else{
      res.render("contact", { Ccontent: contactContent,login:"LOG IN" });
    }
  });

  app.get("/compose", function (req, res) {
    if (req.isAuthenticated()) {
      const userlog = req.user.username.substring(0, req.user.username.indexOf("@"));
      res.render("compose", {login:userlog});
    } else {
      res.render("login",{flag:1});
    } 
  });

  app.get("/login",(req,res)=>{

    if (req.isAuthenticated()) {
      res.render("user",{login: req.user.username.substring(0, req.user.username.indexOf("@"))});
    } else {
        res.render("login",{flag:0});
    }
  });

  app.post("/signup",(req,res)=>{
    User.register({username:req.body.username},req.body.password,(err,user)=>{
      if (err) {
        console.log(err);
        res.render("login");
      } else{
        passport.authenticate("local")(req,res,()=>{
          res.redirect("/");
        });
      }
    })
  });

  app.post("/login",async(req,res)=>{
    const user = new User ({
      username:req.body.username,  
      password:req.body.password
    });
    
    req.login(user,(err)=>{
      if (err) {
        console.log(err); 
      } else {
        passport.authenticate("local")(req,res,()=>{
          res.redirect("/");
        });
      }
    });
  });

  app.post("/logout", function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  app.get("/posts/:pTitle", async (req, res) => {
    var uname = "user";
    
    const posts = [];
      const users =  await User.find({blogs:{$ne:null}});
      users.forEach(u => {
        u.blogs.forEach(blog => {
          posts.push(blog);
        });
      });
    let count = 0;
    let requestedTitle=_.lowerCase(req.params.pTitle);

    for (let i = 0; i < posts.length; i++) {
      if (requestedTitle ===_.lowerCase(posts[i].title)) {
        const author = posts[i].parent().username;
        // console.log(author);

        const reviews = posts[i].reviews;
        console.log("Match Found!")

          if (req.isAuthenticated()) {
            logintext = req.user.username.substring(0, req.user.username.indexOf("@"));
            uname=req.user.username.substring(0, req.user.username.indexOf("@"));
            res.render("post",{title:req.params.pTitle,content:posts[i].body,login:logintext,user:uname,reviews:reviews,author:author});
          }
          else{
            res.render("post",{title:req.params.pTitle,content:posts[i].body,login:"LOG IN",user:0,reviews:reviews,author:author});

          } 
          
        
      } else {
        // console.log("match not found :(");
        count++;
      }

      if (count===posts.length) {

          res.send("post does not exist");
          
      }
      
    }
  });

  app.post("/compose", async function (req, res) {
      if (req.isAuthenticated()) {
          const title = req.body.postTitle;
      const body = req.body.postBody;
      
      const blog = new Blog({
          title:title,
          body:body
      });
      const u = await User.findById(req.user.id)

      u.blogs.push(blog);

      u.save();

      res.redirect("/");

          
      } else {
          res.redirect("/login");
      }
      

  });

  app.post("/review",async(req,res)=>{
    const posts = [];
    const users =  await User.find({blogs:{$ne:null}});

    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < users[i].blogs.length; j++) {
        if (users[i].blogs[j].title===req.body.userInfo) {
            const rev = new Review({
              review:req.body.review,
              author:req.user.username
            })
            users[i].blogs[j].reviews.push(rev);
            users[i].save();
          }
      }
    }

    res.redirect("/posts/"+req.body.userInfo);

  });
}



const PORT = process.env.PORT || 3000 ;

app.listen(PORT, function() {
  console.log("Server started on port "+PORT);
});


