var express = require("express");
var app = express();
var port = process.env.PORT || 3700;
var io = require('socket.io').listen(app.listen(port), {origins:'*:*'});
var Instagram = require('instagram-node-lib');
var http = require('http');
var request = ('request');
var intervalID;

/**
 * Set the paths for your files
 * @type {[string]}
 */
var pub = __dirname + '/public',
    view = __dirname + '/views';

/**
 * Set the 'client ID' and the 'client secret' to use on Instagram
 * @type {String}
 */
var clientID = '194ac511f1f242c7b8ecf453e18cde5e',
    clientSecret = 'bf4bcae46cd7468b8f9e06aed9197adf',
	callBackURL = 'http://pushpress-instagram.herokuapp.com',
	clientHashTag = 'pushpress';

/**
 * Set the configuration
 */
Instagram.set('client_id', clientID);
Instagram.set('client_secret', clientSecret);
Instagram.set('callback_url', clientSecret +'/callback');
Instagram.set('redirect_uri', clientSecret);
Instagram.set('maxSockets', 10);


/**
 * Uses the library "instagram-node-lib" to Subscribe to the Instagram API Real Time
 * with the tag "hashtag" lolla2013
 * @type {String}
 */
Instagram.subscriptions.subscribe({
  object: 'tag',
  object_id: clientHashTag,
  aspect: 'media',
  callback_url: clientSecret +'/callback',
  type: 'subscription',
  id: '#'
});

// if you want to unsubscribe to any hashtag you subscribe
// just need to pass the ID Instagram send as response to you
Instagram.subscriptions.unsubscribe({ id: '3668016' });

// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
io.configure(function () {
  io.set("transports", [
    'websocket'
    , 'xhr-polling'
    , 'flashsocket'
    , 'htmlfile'
    , 'jsonp-polling'
  ]);
  io.set("polling duration", 10);

  
});

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*:*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	res.header("Access-Control-Allow-Credentials", "true")
    return next();
};


/**
 * Set your app main configuration
 */
app.configure(function(){
	app.use(allowCrossDomain);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(pub));
    app.use(express.static(view));
    app.use(express.errorHandler());
});

/**
 * Render your index/view "my choice was not use jade"
 */
app.get("/views", function(req, res){
    res.render("index");
});

// check subscriptions
// https://api.instagram.com/v1/subscriptions?client_secret=YOUR_CLIENT_ID&client_id=YOUR_CLIENT_SECRET

/**
 * On socket.io connection we get the most recent posts
 * and send to the client side via socket.emit
 */
io.sockets.on('connection', function (socket) {
  Instagram.tags.recent({
      name: clientHashTag,
      complete: function(data) {
        socket.emit('firstShow', { firstShow: data });
      }
  });
});

/**
 * Needed to receive the handshake
 */
app.get('/callback', function(req, res){
    var handshake =  Instagram.subscriptions.handshake(req, res);
});

/**
 * for each new post Instagram send us the data
 */
app.post('/callback', function(req, res) {
    var data = req.body;

    // Grab the hashtag "tag.object_id"
    // concatenate to the url and send as a argument to the client side
    data.forEach(function(tag) {
      var url = 'https://api.instagram.com/v1/tags/' + tag.object_id + '/media/recent?client_id='+clientID;
      sendMessage(url);

    });
    res.end();
});

/**
 * Send the url with the hashtag to the client side
 * to do the ajax call based on the url
 * @param  {[string]} url [the url as string with the hashtag]
 */
function sendMessage(url) {
  io.sockets.emit('show', { show: url });
}

console.log("Listening on port " + port);
