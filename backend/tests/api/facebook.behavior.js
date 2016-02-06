'use strict';

var request = require('supertest');
var express = require('express');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var castToObjectId = require('mongodb').ObjectId;
var sinon = require('sinon');
var assert = require('assert');
var nock = require('nock');
var initObjectIdStub = require('objectid-stub');
var initRoutes = require('../../app/routes');

describe('OAuth Facebook endpoints', function() {
  var context;
  var fakeState = new Buffer(JSON.stringify({
    contents: { fake: 'token' },
  })).toString('base64');

  before(function(done) {
    context = {};
    context.checkAuth = function(req, res, next) {
      if(context.mockAuthenticated) {
        return next();
      }
      res.sendStatus(401);
    };
    context.tokens = {
      createToken: sinon.stub().returns({
        contents: { fake: 'token' },
      }),
      checkToken: sinon.stub().returns(true),
    };
    context.time = sinon.stub().returns(1664);
    context.env = {
      SESSION_SECRET: 'none',
      FACEBOOK_ID: '123-456-789',
      FACEBOOK_SECRET: 'shhh-its-a-secret',
      mobile_path: path.join(__dirname, '..', '..', '..', 'mobile', 'www'),
    };
    context.logger = {
      error: sinon.spy(),
      debug: sinon.spy(),
      info: sinon.spy(),
    };
    context.createObjectId = initObjectIdStub({
      ctor: castToObjectId,
    });
    context.base = 'http://tripstory.insertafter.com';
    MongoClient.connect('mongodb://localhost:27017/tripstory_test')
      .then(function(db) {
        context.db = db;
        done();
      });
    context.bus = {
      trigger: sinon.spy(),
    };
  });

  before(function(done) {
    context.app = express();
    initRoutes(context);
    done();
  });

  afterEach(function(done) {
    context.db.collection('users').deleteMany({}, done);
  });

  beforeEach(function() {
    context.mockAuthenticated = false;
  });

  describe('entry point', function() {

    it('should redirect to the OAuth page', function(done) {
      request(context.app).get('/auth/facebook')
        .expect(302)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }
          assert(context.tokens.createToken.callCount, 1);
          assert.equal(
            res.headers.location,
            'https://www.facebook.com/v2.2/dialog/oauth' +
            '?response_type=code' +
            '&redirect_uri=' + encodeURIComponent(
              context.base + '/auth/facebook/callback'
            ) +
            '&scope=public_profile%2Cemail%2Cuser_friends' +
            '&state=' + encodeURIComponent(fakeState) +
            '&client_id=' + context.env.FACEBOOK_ID
          );
          done();
        });
    });

  });

  describe('callback endpoint', function() {
    var accessTokenCall;
    var profileCall;

    beforeEach(function() {
      accessTokenCall = nock('https://graph.facebook.com:443', {
        encodedQueryParams: true,
      })
      .post(
        '/oauth/access_token',
        'grant_type=authorization_code' +
        '&redirect_uri=' + encodeURIComponent(
          context.base + '/auth/facebook/callback'
        ) +
        '&client_id=' + context.env.FACEBOOK_ID +
        '&client_secret=' + context.env.FACEBOOK_SECRET +
        '&code=THISISIT')
      .basicAuth({
        user: context.env.FACEBOOK_ID,
        pass: context.env.FACEBOOK_SECRET,
      })
      .reply(
        200, {
          access_token: 'COMMON_BOY',
          expires: '5183533',
        }, {
          'access-control-allow-origin': '*',
          'content-type': 'text/plain; charset=UTF-8',
          'x-fb-trace-id': 'HK+ldZSWY4h',
          'x-fb-rev': '2168097',
          pragma: 'no-cache',
          'cache-control': 'private, no-cache, no-store, must-revalidate',
          'facebook-api-version': 'v2.0',
          expires: 'Sat, 01 Jan 2000 00:00:00 GMT',
          vary: 'Accept-Encoding',
          'x-fb-debug': '09l2f32pxz1J7AM6zsWXu8nObBUVw2YAaqzRHA1T3JuKnzFcHVBtibH92F0/VOOxxGmqkSprL1t0lZX+UWIerQ==',  // eslint-disable-line
          date: 'Sat, 06 Feb 2016 10:01:52 GMT',
          connection: 'close',
        });


      profileCall = nock('https://graph.facebook.com:443', {
        encodedQueryParams: true,
      })
      .get('/v2.2/me')
      .query({
        fields: 'id%2Cname%2Cpicture%2Cemail',
        access_token: 'COMMON_BOY',
      })
      .reply(200, {
        id: '1664',
        name: 'Nicolas Froidure',
        picture: { data: {
          is_silhouette: false,
          url: 'https://robohash.org/lol',
        } },
        email: 'clown@fake.fr',
      }, {
        'content-type': 'text/javascript; charset=UTF-8',
      });
    });

    describe('when user is not known', function() {

      it('should work', function(done) {
        var newUserId = context.createObjectId.next();

        request(context.app).get(
          '/auth/facebook/callback' +
          '?state=' + encodeURIComponent(fakeState) +
          '&client_id=' + context.env.FACEBOOK_ID +
          '&client_secret=' + context.env.FACEBOOK_SECRET +
          '&code=THISISIT'
        )
          .expect(301)
          .end(function(err) {
            if(err) {
              return done(err);
            }
            accessTokenCall.done();
            profileCall.done();
            context.db.collection('users').findOne({
              emailKeys: { $all: ['clown@fake.fr'] },
            }).then(function(user) {
              assert(user, 'User was created!');
              assert.deepEqual(user, {
                _id: newUserId,
                contents: {
                  name: 'Nicolas Froidure',
                  email: 'clown@fake.fr',
                  photo: 'https://robohash.org/lol',
                },
                auth: {
                  facebook: {
                    id: '1664',
                    accessToken: 'COMMON_BOY',
                    refreshToken: null,
                  },
                },
                emailKeys: ['clown@fake.fr'],
              });
              done();
            }).catch(done);
          });
      });

    });

    describe('when user is known', function() {

      beforeEach(function(done) {
        context.db.collection('users').insertOne({
          _id: castToObjectId('abbacacaabbacacaabbacaca'),
          contents: {
            name: 'Popol',
            email: 'popol@moon.u',
          },
          emailKeys: ['popol@moon.u'],
          passwordHash: '$2a$10$s4FQh8WjiYQfx6gdO4AXAePe7tj4HXoo8fIcTsjD6YGkZ/B2oDDpW',
          auth: {
            facebook: {
              id: '1664',
              accessToken: 'COMMON_BOY',
              refreshToken: null,
            },
          },
        }, done);
      });

      it('should work', function(done) {
        request(context.app).get(
          '/auth/facebook/callback' +
          '?state=' + encodeURIComponent(fakeState) +
          '&client_id=' + context.env.FACEBOOK_ID +
          '&client_secret=' + context.env.FACEBOOK_SECRET +
          '&code=THISISIT' // eslint-disable-line
        )
          .expect(301)
          .end(function(err) {
            if(err) {
              return done(err);
            }
            accessTokenCall.done();
            profileCall.done();
            context.db.collection('users').findOne({
              _id: castToObjectId('abbacacaabbacacaabbacaca'),
            }).then(function(user) {
              assert(user, 'User was created!');
              assert.deepEqual(user, {
                _id: castToObjectId('abbacacaabbacacaabbacaca'),
                contents: {
                  name: 'Nicolas Froidure',
                  email: 'clown@fake.fr',
                  photo: 'https://robohash.org/lol',
                },
                auth: {
                  facebook: {
                    id: '1664',
                    accessToken: 'COMMON_BOY',
                    refreshToken: null,
                  },
                },
                emailKeys: ['popol@moon.u', 'clown@fake.fr'],
                passwordHash: '$2a$10$s4FQh8WjiYQfx6gdO4AXAePe7tj4HXoo8fIcTsjD6YGkZ/B2oDDpW',
              });
              done();
            }).catch(done);
          });
      });

    });

  });

});
