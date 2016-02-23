/* global process, __dirname */
var application_root = __dirname,
    express = require("express"),
    bodyParser = require("body-parser"),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    path = require("path"),
    url = require('url'),
    logger = require('morgan'),
    _ = require('lodash'),
    db = require("./repository"),
    app = express(),
    http = require('http').Server(express);

var service = require("./service"),
    apiProxy = require("./api-proxy");
    
//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Origin", "s.codepen.io");

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD, OPTIONS, MERGE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        res.end();
    }

    return next();
}

// Config
app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());
app.set('view engine', 'jade');
app.engine('html', require('jade').renderFile);
app.use(express.static(path.join(application_root, "public")));
app.use(errorHandler({ dumpExceptions: true, showStack: true }));

app.get('', function(req, res){
  res.render('index', { title: 'WasteLine' });
});
app.get('/', function(req, res){
  res.render('index', { title: 'WasteLine' });
});

app.get('/api', function (req, res) {
    res.send('WasteLine API proxy is running');
});

["Route", "Cycle", "Address", "User", "Notification"].forEach(function (entity) {
    app.get('/api/' + entity, function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
        res.header("Content-Type", "application/json");
        res.header("Cache-Control", "private, max-age=0, no-cache");
        
        var query = _.extend(req.body, url.parse(req.url, true).query);

        db.get(entity, query)
            .then(function (items) {
                var response = JSON.stringify(items);
                res.send(response);
            })
            .fail(function (error) {
                console.log(error);
                var message = {
                        serviceStatus: "Bad request"
                    },
                    response = JSON.stringify(message);
                res.send(response);
            })
            .fin(res.end);
    });
});

app.post('/api/Authenticate', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST");
    res.header("Content-Type", "application/json");
    
    var credentials = req.body;
    
    db.authenticate(credentials)
        .then(function (user) {
            var response = JSON.stringify(user);
            res.send(response);
        })
        .fail(function (error) {
            console.log(error);
            var message = {
                    serviceStatus: "Bad request"
                },
                response = JSON.stringify(message);
            res.send(response);
        })
        .fin(res.end);
});

app.post('/api/Search', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST");
    res.header("Content-Type", "application/json");
    
    var data = req.body || {};
    
    service.geocodeAddress(String(data.address).toUpperCase() + ", CARY, NC").then(function (result) {
        console.log(result.coordinates);
        
        var response = {
            address: result.address,
            coordinates: result.coordinates
        };
        
        apiProxy.getCycle(result.coordinates).then(function (result) {
           console.log(result); 
           response.cycle = result.cycle;
           response.day = result.day;
           response.isRecyclingWeek = service.isRecyclingWeek(result.cycle);
           response.isHolidayWeek = service.isHolidayWeek ();
           res.send(response);
           res.end();
        }, function (error) {
           console.error(error);
           response.error = error;
           res.send(response);
           res.end();
        })
        .catch (function (ex) {
            console.error(ex.message);
            res.end();
        });
    });
});

app.get('/api/NextTwoWeeks', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST");
    res.header("Content-Type", "application/json");
  
    res.send(service.getNextTwoWeeks());
    res.end();
});

var port = process.env.PORT || process.env.WASTELINE_PORT || 80;
console.log((new Date(Date.now())).toLocaleString());
console.log("Listening on port " + port);
var server = app.listen(port);

var io = require("socket.io")(server);

// Emit welcome message on connection
io.sockets.on('connection', function(socket) {
    socket.emit('welcome', { message: 'Welcome!' });
    console.log("A user connected");
    socket.on('i am client', console.log);
    socket.on('add-occasion', function (occasion) {
        console.log('adding an occasion "%s"', occasion.tagline);
        socket.emit('new-occasion', occasion);
    });
});

var proxy = io.sockets
  .on('add-occasion', function (socket) {
    console.log('adding an occasion');
    socket.emit('a message', {
        that: 'only'
      , '/chat': 'will get'
    });
    chat.emit('a message', {
        everyone: 'in'
      , '/chat': 'will get'
    });
  });

var chat = io
  .of('/chat')
  .on('connection', function (socket) {
    socket.emit('a message', {
        that: 'only'
      , '/chat': 'will get'
    });
    chat.emit('a message', {
        everyone: 'in'
      , '/chat': 'will get'
    });
  });

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}
// production error handler
// no stacktraces leaked to user
else {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}


module.exports = app;
