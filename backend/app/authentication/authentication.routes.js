'use strict';

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var initAuthenticationController = require('./authentication.controller');
var usersTransforms = require('../users/users.transforms');
var YHTTPError = require('yhttperror');
var authenticationUtils = require('./authentication.utils');

module.exports = initAuthenticationRoutes;

function initAuthenticationRoutes(context) {
  context.passport = initAuthenticationController(context);

  context.app.use(session({
    secret: context.env.SESSION_SECRET,
    store: new MongoStore({ db: context.db }),
  }));
  context.app.use(context.passport.initialize());
  context.app.use(context.passport.session());

  context.app.post('/api/v0/login', function(req, res, next) {
    context.passport.authenticate('local', {
      failWithError: true,
      badRequestMessage: 'E_BAD_CREDENTIALS',
    }, function(err, user, message, status) {
      if(err) {
        return next(YHTTPError.cast(err));
      }

      if(!user) {
        return next(new YHTTPError(status, message.message));
      }

      req.logIn(user, function(err) {
        if (err) {
          return next(YHTTPError.cast(err));
        }
        res.status(200).send(usersTransforms.fromCollection(user));
      });
    })(req, res, next);
  });

  context.app.post('/api/v0/signup', function(req, res, next) {
    context.passport.authenticate('local-signup', function(err, user) {
      if (err) {
        return next(YHTTPError.cast(err));
      }
      if (!user) {
        return res.sendStatus(401);
      }
      req.logIn(user, function(err) {
        if (err) {
          return next(YHTTPError.cast(err));
        }
        res.status(201).send(usersTransforms.fromCollection(user));
      });
    })(req, res, next);
  });

  context.app.post('/api/v0/logout', context.checkAuth, function authLogout(req, res) {
    req.logout();
    req.session.destroy();
    res.sendStatus(204);
  });

  context.app.get(
    '/auth/facebook',
    authenticationUtils.initPassportWithAStateObject(context, 'facebook',
    { scope: ['public_profile', 'email', 'user_friends'] }
  ));
  context.app.get(
    '/auth/facebook/callback',
    authenticationUtils.checkStateObjectAndPassport(
      context, 'facebook', { failureRedirect: '/me' }
    ),
    authenticationUtils.redirectToApp
  );

  context.app.get(
    '/auth/google',
    authenticationUtils.initPassportWithAStateObject(context, 'google',
    { scope: ['profile', 'email'] }
  ));

  context.app.get(
    '/auth/google/callback',
    authenticationUtils.checkStateObjectAndPassport(
      context, 'google', { failureRedirect: '/me' }
    ),
    authenticationUtils.redirectToApp
  );

  context.app.get(
    '/auth/twitter',
    authenticationUtils.initPassportWithAStateObject(context, 'twitter',
    { scope: ['profile', 'email'] }
  ));
  context.app.get(
    '/auth/twitter/callback',
    authenticationUtils.checkStateObjectAndPassport(
      context, 'twitter', { failureRedirect: '/me' }
    ),
    authenticationUtils.redirectToApp
  );

  context.app.get(
    '/auth/xee',
    authenticationUtils.initPassportWithAStateObject(context, 'xee',
    { scope: [
      'user_get', 'email_get', 'car_get', 'data_get',
      'location_get', 'address_all', 'accelerometer_get',
    ] }
  ));
  context.app.get(
    '/auth/xee/callback',
    authenticationUtils.checkStateObjectAndPassport(
      context, 'xee', { failureRedirect: '/me' }
    ),
    authenticationUtils.redirectToApp
  );

  context.app.get(
    '/api/v0/profile',
    context.checkAuth,
    authenticationUtils.redirectToProfile
  );

  context.app.get(
    '/api/v0/me',
    context.passport.authenticate('basic', { session: false }),
    authenticationUtils.redirectToProfile
  );

}
