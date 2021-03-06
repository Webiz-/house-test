/*global __dirname*/

console.log('Server start on');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var fs = require('fs');
var CronJob = require('cron').CronJob;

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    dbConnectionString = mongoURL;
  }
}

if (mongoURL === null) {
  mongoURL = 'mongodb://localhost/houseTracking-v2';
}

console.log('[database] Try to connect:' + mongoURL);
mongoose.connect(mongoURL);
var db = mongoose.connection;

db.on('error', console.error.bind(console, '[database] Connection error:'));
db.once('open', function (callback) {
    console.log('[database] connected:' + dbConnectionString);
});


var app = express();
app.locals.moment = require('moment');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Make sure this comes before your routes.
app.use(function(req, res, next) {
    res.locals.url = req.url;
    next();
});

//Auto Load Models
fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/models/' + file);
});

//Auto Load adapter
fs.readdirSync(__dirname + '/adapter').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/adapter/' + file);
});

//Auto Load Routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if (~file.indexOf('.js')) {
    var route = require(__dirname + '/routes/' + file),
        routeName = file.replace('.js', '');

    if (routeName === 'index') {
      app.use('/', route);
    } else {
      app.use('/' + routeName, route);
    }
  }
});

if (process.env.OPENSHIFT_MONGODB_DB_URL) {
    var Job = require('./adapter/job.js');

    // manage cron
    new CronJob({
        cronTime: '0 0 */4 * * *',
        onTick: function() {
            console.log('[CRON] - crawl');
            Job.crawl();
        },
        start: false,
        timeZone: 'America/Los_Angeles'
    }).start();

    new CronJob('0 0 23 * * *', function () {
        console.log('[CRON] - clean');
        Job.clean();
    }, null, false, 'America/Los_Angeles').start();
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;
