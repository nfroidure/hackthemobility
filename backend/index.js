'use strict';

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var express = require('express');
var initRoutes = require('./app/routes');
var Promise = require('bluebird');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var winston = require('winston');
var Twitter = require('twitter');
var util = require('util');

// Twitter logger transport
var TwittLog = exports.TwittLog = function TwittLog(options) {
  this.client = new Twitter(options || {});
};

util.inherits(TwittLog, winston.Transport);
TwittLog.prototype.log = function log(level, msg, meta, callback) {
  var self = this; // eslint-disable-line

  msg = msg.substring(0, 128) + '… #jdmc15';
  this.client.post('statuses/update', { status: msg }, function twitterCb(error) {
    if (error) {
      console.log(error); // eslint-disable-line no-console
      self.emit('error', error);
    }
  });

  this.emit('logged');

  callback(null, true);
};
winston.add(TwittLog, {
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_TOKEN_SECRET,
});

// Preparing services
Promise.all([
  MongoClient.connect(process.env.MONGODB_URL),
]).spread(function handleServerServices(db) {
  var context = {};

  // Services
  context.db = db;
  context.app = express();
  context.createObjectId = ObjectId;
  context.castToObjectId = ObjectId;
  context.logger = winston;
  context.checkAuth = function isLoggedIn(req, res, next) {
    console.log('isLoggedIn', req.isAuthenticated(), req.user);
    if(req.user || req.isAuthenticated()) {
      return next();
    }
    res.sendStatus(401);
  };

  // Middlewares
  context.app.use(express.static('www'));
  context.app.use(bodyParser.json());
  context.app.use(cookieParser());
  context.host = 'localhost';
  context.port = 3000;

  // Routes
  initRoutes(context);

  // Starting the server
  return new Promise(function handleServerPromise(resolve, reject) {
    context.server = context.app.listen(context.port, function handleServerCb(err) {
      if(err) {
        return reject(err);
      }

      context.logger.info('Patrick is here \\o/ -> http://%s:%s', context.host, context.port);
      resolve();
    });
  });
});
