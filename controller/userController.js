// const { render } = require("../app");
const Post = require("../model/Post");
const User = require("../model/User");
const Follow  = require("../model/Follow")

exports.sharedProfileData = async function(req,res,next){

  var isVisitorsProfile = false //kya visitor hi khud ki profile dekh rha h 
  var isFollowing = false
  if(req.session.user){
    // console.log("jain sahab");
    isVisitorsProfile = req.profileUser._id.equals(req.session.user._id) 
    
    isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    console.log(isFollowing);
    
  }
  req.isVisitorsProfile = isVisitorsProfile
  req.isFollowing = isFollowing

   //retrieve post, follower and following counts
   let postCount = await Post.countPostsByAuthor(req.profileUser._id)
   let followerCount = await Follow.countFollowersById(req.profileUser._id)
   let followingCount = await Follow.countFollowingById(req.profileUser._id)

   req.postCount = postCount
   req.followerCount = followerCount
   req.followingCount = followingCount
   




  next()


}




exports.register = (req, res) => {
  //console.log(req.body);//in order to get this we need to used middle-wares {//use of middle-wares
  //app.use(express.urlencoded({extended: false})); // false to remove deprecated warning
  //app.use(express.json()); in app.js}

  let user = new User(req.body);

  user
    .register()
    .then(() => {
      // res.send("registered successfully!!!")
      req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id }; //if not savd it will forget this so session.save
      req.session.save(() => res.redirect("/"));
    })
    .catch((err) => {
      // console.log(err);
      // res.send("err!!!!")
      // req.flash('errors', err);
      err.forEach((error) => {
        req.flash("regErrors", error); //it will store the error in regErrors
      });
      req.session.save(() => res.redirect("/"));
    });
};

//TWO TYPES OF AUTH- SESSION, TOKEN

exports.login = (req, res) => {
  // console.log(req.body);
  let user = new User(req.body);

  user.login().then((result) => {
      // console.log(result);///'login-successfull'
      // res.render('home-logged-in-no-results')
      
      req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id }; //if not savd it will forget this so session.save
      //these things will be saved in db for a particular session.
      req.session.save(() => res.redirect("/"));
    })
    .catch((err) => {
      // console.log(err); instead of this do show flash msg
      //req.session.flash.errors = [err] <----- we would had done this but it would become difficult to destroy
      //below same as above
      req.flash("errors", err);
      // res.redirect('/');
      req.session.save(() => res.redirect("/"));
    });
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect("/"));
};

exports.home = async(req, res) => {
  //console.log(req.session);
  //  if (user){ <---- ye mt likh dena 
    if (req.session.user) {
      let posts = await Post.getFeed(req.session.user._id)
      res.render("home-dashboard", {posts: posts});
  } else {
    res.render("home-guest", {regErrors: req.flash("regErrors")});
  }
};


exports.ifUserExists = (req,res,next) =>{
  User.findByUserName(req.params.username).then(userDoc =>{
        req.profileUser = userDoc
        next();
  }).catch(()=>{
    res.render('404')
  })
}


exports.profilePostsScreen = (req,res,next) =>{
        Post.findByAuthorId(req.profileUser._id).then(posts =>{
          // console.log(req.isFollowing)

          res.render('profile',{
            currentPage: "posts",
            posts: posts,
            profileUserName: req.profileUser.username,
            profileProfile: req.profileUser.profile,
            profileAvatar : req.profileUser.avatar,
            isVisitorsProfile : req.isVisitorsProfile,
            isFollowing : req.isFollowing,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
           
          })

      }).catch(()=>{
          res.render('404')
        })
}



exports.profileFollowersScreen = async(req,res,next) =>{

  
  try{
      let followers = await Follow.getFollowersById(req.profileUser._id)

      res.render('profile-followers',{
        currentPage: "followers",
        followers: followers,
        profileUserName: req.profileUser.username,
        profileProfile: req.profileUser.profile,
        profileAvatar : req.profileUser.avatar,
        isVisitorsProfile : req.isVisitorsProfile,
        isFollowing : req.isFollowing,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
       
      })
    }catch{
        res.render('404')
  }
        
}


exports.profileFollowingScreen = async(req,res,next) =>{

  
  try{
      let following = await Follow.getFollowingById(req.profileUser._id)

      res.render('profile-following',{
        currentPage: "following",
        following: following,
        profileUserName: req.profileUser.username,
        profileProfile: req.profileUser.profile,
        profileAvatar : req.profileUser.avatar,
        isVisitorsProfile : req.isVisitorsProfile,
        isFollowing : req.isFollowing,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
       
      })
    }catch{
        res.render('404')
  }
        
}