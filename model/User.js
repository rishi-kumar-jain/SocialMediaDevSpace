const validator = require('validator')
const bcrypt = require('bcrypt');
const md5  = require('md5');

const usersCollection = require('../db').db().collection("users");


let User = function(data, getAvatar){
    // https://www.geeksforgeeks.org/this-in-javascript/
    this.data = data //class variable
    this.errors = []
    // this.register = function(){
    //     console.log("hi");
    // }isi ko neatness le liye bahar likh diya prototype ki madad se.
    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()}

}


User.prototype.cleanUp = function(){
    if(typeof(this.data.username) != "string"){this.data.username = ""}
    if(typeof(this.data.email)!="string"){this.data.email =""}
    if(typeof(this.data.password) != "string"){this.data.password = ""}

    //get rid of bogus property
    this.data = {
        username : this.data.username.trim().toLowerCase(),
        profile: this.data.profile,
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}


User.prototype.validate = function(){

        return new Promise(async (resolve, reject)=>{
            if(this.data.username == ""){this.errors.push("You must provide a username")}
            if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers.")}
            if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email address.")}
            if (this.data.password == "") {this.errors.push("You must provide a password.")}
            if (this.data.password.length > 0 && this.data.password.length < 6) {this.errors.push("Password must be at least 6 characters.")}
            if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters.")}
            if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 characters.")}
            if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
    
            if(this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)){
                let usernameExist = await usersCollection.findOne({username: this.data.username})
                if(usernameExist) {this.errors.push("Username already exists.")}
            }
            if(validator.isAlphanumeric(this.data.email)){
                let emailExist = await usersCollection.findOne({email: this.data.email})
                if(emailExist) {this.errors.push("Email already exists")}
            }
            resolve();
        })
        
    
}

User.prototype.register = function(){

    // console.log("hi");
    // use arrow function below instead of traditional function otherwise this.data will be undefined 
    // and mongodb error: Cannot read property '_id' of undefined as the data will be empty
        return new Promise(async (resolve, reject)=>{
            // await usersCollection.insertOne(this.data)
            // resolve("done")

            //s1 : validate and cleanup data
            this.cleanUp();
            await this.validate();
            
            //s2 : store the user into the db
            if(!this.errors.length){

                //password ko database me jane se phle encrypt krdo taki hackers dkh na paye.
                let salt = bcrypt.genSaltSync(10) 
                this.data.password = bcrypt.hashSync(this.data.password, salt)  //bnalo pass hashed  
                
                await usersCollection.insertOne(this.data)
                this.getAvatar(); // db me save na krke jab jb ye fun call hoga tbhi bnega aur bad me destroy ho jayega
                resolve();
            }else{
                reject(this.errors);
            }
        })
}


User.prototype.login = function(){
    return new Promise((resolve,reject)=>{
        this.cleanUp()
        usersCollection.findOne({username: this.data.username}).then(attemptedUser =>{
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)){
                this.data = attemptedUser
                this.getAvatar()  // if used before the db query then it would store the avatar as well
                //  db me save na krke jab jb ye fun call hoga tbhi bnega aur bad me destroy ho jayega
                resolve("loign successfull")
            }else{
                reject("Invalid username/pass")
            }
        }).catch(()=>{
            reject("Please try again later")
        })
    })
}


User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}


User.findByUserName = function(username){
     return new Promise((resolve, reject)=>{
        if(typeof(username)!= 'string'){
            reject();
            return
        } 

        usersCollection.findOne({username: username}).then(userDoc =>{
            if(userDoc){ // ye isliye kyuki ho skta h username mile hi ni
                userDoc = new User(userDoc, true);
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    profile: userDoc.data.profile,
                    avatar: userDoc.avatar, // ye isliye ho paya kyuki  userDoc = new User(userDoc, true) true rkhi h value to getAvatar() call hogi to this.avatar set ho jyegi avatar link s
                }
                resolve(userDoc);
            }
            else{
                reject("error in finding user!!")
            }
        }).catch(()=>{
            reject("db error!!")
        })


     })
}











module.exports = User;