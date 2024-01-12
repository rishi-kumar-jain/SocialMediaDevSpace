const ObjectID = require("mongodb").ObjectId;
const User = require('./User')


const followsCollection = require('../db').db().collection("follows");

const postsCollection = require('../db').db().collection("posts");

let Post = function(data, userId, requestedPostId){
    this.data = data;
    this.errors = [];
    this.userId= userId;
    this.requestedPostId = requestedPostId;
}



Post.prototype.cleanUp = function(){
    if(typeof(this.data.title) != "string"){this.data.title = ""}
    if(typeof(this.data.body) != "string"){this.data.body = ""}

    this.data = {
        title :  this.data.title.trim(),
        body  : this.data.body.trim(),
        createDate : new Date(),
        author: new ObjectID(this.userId)
    }
}


Post.prototype.validate = function(){
        if(this.data.title == ""){this.errors.push("you must porvide a title")}
        if(this.data.body == ""){this.errors.push("You must provide a body")}
}

Post.prototype.createPost = function(){
    return new Promise((resolve,reject)=>{
        this.cleanUp();
        this.validate();

        if(!this.errors.length){
            postsCollection.insertOne(this.data).then(info=>{
                // console.log(data);
                resolve(info.insertedId) // in  built
            }).catch(()=>{
                this.errors.push("please try again later...")
               
                reject(this.errors)
            })
        }else{
            
            reject(this.errors)
        }
    })
}



Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations=[]){
    return new Promise(async(resolve,reject)=>{
        let aggOperations = uniqueOperations.concat([
            //lookup post ka object ke andr hi authDocument bhi lega jo ki array hogi aur usme user collection ki row jaegi eg
            {$lookup: {from: 'users', localField: "author", foreignField: "_id", as: "authorDocument"}},
            //wht field to show and wht not use porject
            {$project:{
                title: 1,//show
                body: 1,//show
                createDate: 1,//show
                authorId: '$author',  //post's author field
                author: {$arrayElemAt: ["$authorDocument", 0]} 
            }}
        ]).concat(finalOperations)

        let posts = await postsCollection.aggregate(aggOperations).toArray()
        //yaha bs mapping ho rhi h project bs wahi honge jinhe project krya gya h
        posts = posts.map(function(post){  
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined 
            post.author = {   //author me se keval username aur avatar hi chahiye.
                username: post.author.username,
                avatar: new User(post.author, true).avatar
                // this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
            }
            return post //map me return krana padega.
        })
        resolve(posts)
    })
}






//in order to access prototyped function we need to create object first but we can also access functions of functions without creating object

Post.findSingleById = function(id, visitorId){
    return new Promise(async(resolve, reject)=>{// bcoz we are doing db operation so used promise function
        if(typeof id !== 'string' || !ObjectID.isValid(id)){
            reject();
            return;
        }
            
        let posts = await Post.reusablePostQuery([
            {$match: {_id : new ObjectID(id)}}
            // $ added with query not with _id 
        ], visitorId)


       
// let post = await postsCollection.findOne({_id : new ObjectID(id)})
        if(posts.length){
            
            console.log(posts[0]);
            resolve(posts[0])
        }else{
            reject()
        }
    })
}


//auhtor ki sari posts
Post.findByAuthorId = function(authorId){
    return new Promise(async (resolve, reject)=>{
        let posts = await postsCollection.find({author: new ObjectID(authorId)}).toArray();
        console.log(posts);
        resolve(posts);
        })
    
}

Post.prototype.actuallyUpdate = function(){
    return new Promise(async(resolve,reject)=>{
        this.cleanUp()
        this.validate()
        if(!this.errors.length){
            await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)}, {$set : {title: this.data.title, body: this.data.body}})
            resolve('success')
        }else{
            reject('failure')
        }
    })
}



Post.prototype.update = function(){
    return new Promise(async(resolve,reject)=>{
        try{
            let post = await Post.findSingleById(this.requestedPostId, this.userId)
            if(post.isVisitorOwner){
                let status = await this.actuallyUpdate()
                resolve(status);
            }else{
                reject('not owner')
            }
        }
        catch{
            reject('db error')
        }
    })
}




Post.delete = function(postIdToDelete, currentUserId){
    return new Promise(async(resolve, reject)=>{
        try{
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if(post.isVisitorOwner){
                await postsCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
                resolve()
            }else{
                reject()
            }
        }catch{
            reject()
        }
    })
}


Post.search = function(searchTerm){
    return new Promise(async(resolve, reject)=>{
        if(typeof(searchTerm) == 'string'){
            let posts = await Post.reusablePostQuery([
                {$match:{$text: {$search: searchTerm}}}, // atlas m jake index me jke title aur body dono ko text kr diya .

            ],undefined,[{$sort: {score: {$meta: "textScore"}}}])//ye sorting k liye text kitte percent match kha rha h uske hisab se 
            resolve(posts)
        }else{
            reject("not a string!!")
        }
    })
}

Post.countPostsByAuthor = function(id){
    return new Promise(async (resolve, reject) => {
      let postCount = await postsCollection.countDocuments({author: id})
      resolve(postCount)
    })
  }

Post.getFeed = async function(id){
    //create an array of user id that the current user is following 
    let followedUsers = await followsCollection.find({authorId:new ObjectID(id)}).toArray()

    followedUsers = followedUsers.map(followDoc =>{
        return followDoc.followedId
    })

    //look for the posts where the author is from the above array
    return Post.reusablePostQuery([
        {$match :{author: {$in: followedUsers}}},
        {$sort :{createDate: -1}}
    ])
     

}






module.exports = Post