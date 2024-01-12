const express = require('express');

const session = require('express-session');
const flash = require('connect-flash')
const MongoStore = require('connect-mongo');
const app = express();


//sb kuch views directry me rkhna
app.set("view engine", 'ejs')

//to serve the static files we usd ths
app.use(express.static('public'))


//use of middle-wares
app.use(express.urlencoded({extended: false})); //if strings are there in the request so inorder to recognize them as strings or arrays
app.use(express.json());//recognises the json object from incoming post request 

let sessionOptions = session({
    //these are default things
    secret: "Js is cool",
    store: MongoStore.create({client: require('./db')}),//isse db ka access krwa liya.
    //export client from ./db//
    //above line will create a data SESSION DATA IN database so that when we open the site after sleep or due to other reason session continues ,ie, session ko hi db me store kr lo (save tbhi hoga jab karwaoge yaha se bs db ka access mila hai)//

    resave : false,
    saveUninitialized: false,
    cookie: {maxAge: 1000*60*60*10 ,httpOnly: true } //max age till how much time to remember the session
})

app.use(sessionOptions);
app.use(flash());

const router = require('./router');

//HEADER ke ander ek jagha comparison hoga ki user hai ya ni to usme error de dega ki user to defined hi ni h to iske liye below 
//codes kiye h isse hoga ye locally session ka user save ho jyega.
//yeh ek middle ware hai
//Middleware functions are functions that have access to the request object (req), the response object (res), and the next 
//middleware function in the application’s request-response cycle. The next middleware function is commonly denoted by a 
//variable named next.


app.use(function(req,res,next){


    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash('success')

    if(req.session.user){
        req.visitorId = req.session.user._id
        //while login and registor req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id }
    }
    else{
        req.visitorId = 0;
    }



    res.locals.user = req.session.user; // {user : req.session.user}
    // keval front end ko hi milega 
    // now the user will be availabe locally so that
    //header.ejs inside this when asked for user , this user would be passed.//similary for other pages as well. 
    next();
})



app.use('/', router);


const server = require('http').createServer(app);
//http.createServer(requestListener); requestListner:- Specifies a function to be executed every time the server gets a request. 
//This function is called a requestListener, and 
//handles request from the user, as well as response back to the user.

const io = require('socket.io')(server);
//initializes a Socket.IO server and associates it with an existing HTTP server (server).


//use of middleware
//make express session data available from the socket
io.use(function(socket, next){
    sessionOptions(socket.request , socket.request.res, next)
})



io.on('connection', (socket) => {
    // console.log("new user connected");
    if(socket.request.session.user){
        let user = socket.request.session.user 

        socket.emit('welcome', {username: user.username, avatar : user.avatar})



        socket.on('chatMessageFromBrowser', function(data){
            // io.emit('chatMessageFromServer',{message : data.message})
            //here what io do is that it is sending msg to everyone including itself so due to this we will use scoket.broadcast.emit
            // instead of io.emit ,
            // scoket.broadcast.emit :  will send to everyone other then itslef
             socket.broadcast.emit('chatMessageFromServer',{message : data.message, username: user.username, avatar: user.avatar})
    
        });
    
    }
    // socket.on('disconnect', () => { /* … */ });
  });



//here we are using http server which we created using our express app so we will export server not app   
// module.exports = app;
module.exports = server;