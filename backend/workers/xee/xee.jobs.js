'use strict';

var request = require('request');
var workersUtils = require('../utils');
var controllersUtils = require('../../app/utils/controllers');

var SERVER = 'https://cloud.xee.com/v1';
var xeeJobs = {
  A_XEE_SYNC: xeeSyncJob,
  A_XEE_SIGNUP: xeeSignupJob,
  A_XEE_LOGIN: xeeSignupJob,
};
var lastLatitude;
var lastLongitude;

module.exports = xeeJobs;

function xeeSignupJob(context, event) {
  return context.db.collection('users').findOne({
    _id: event.contents.user_id,
  })
  .then(function(user) {
    return new Promise(function xeeCarsPromise(resolve, reject) {
      context.logger.debug(
        SERVER +
        '/user/' + user.auth.xee.id + '/car.json' +
        '?access_token=' + user.auth.xee.accessToken);
      request.get(
        SERVER +
        '/user/' + user.auth.xee.id + '/car.json' +
        '?access_token=' + user.auth.xee.accessToken,
        function handleXEECars(err, res, data) {
          if(err) {
            return reject(err);
          }
          context.logger.debug(data);
          try {
            data = JSON.parse(data);
          } catch(err) {
            return reject(err);
          }
          context.logger.debug(data);
          resolve(data);
        }
      );
    }).then(function(cars) {
      context.db.collection('users').updateOne({
        _id: user._id,
      }, {
        $set: {
          cars: cars.filter(function(car) {
            return (!user.cars) || user.cars.every(function(userCar) {
              return userCar.xeeId !== car.id;
            });
          }).map(function(car) {
            return {
              _id: context.createObjectId(),
              name: car.name,
              brand: car.brand,
              xeeId: car.id,
            };
          }),
        },
      });
    });
  });
}

function xeeSyncJob(context, event) {

  return workersUtils.getCurrentTrips(context, {
    carOnly: true,
  })
  .then(function handleXEETrips(tripsEvents) {
    return Promise.all(tripsEvents.map(function(tripEvent) {
      return context.db.collection('users').findOne({
        _id: tripEvent.owner_id,
        cars: { $elemMatch: {
          _id: tripEvent.trip.car_id,
        } },
      }).then(function(user) {
        var car = user.cars.filter(function(car) {
          return tripEvent.trip.car_id.toString() === car._id.toString() &&
            'xee' === car.type;
        })[0];

        if(!car) {
          return Promise.resolve();
        }

        return new Promise(function xeePositionPromise(resolve, reject) {
          request.get(
            SERVER +
            '/car/' + car.xeeId + '/carstatus.json' +
            '?access_token=' + user.auth.xee.accessToken,
            function(err, res, data) {
              context.logger.debug(JSON.stringify(data, null, 2));
              if(err) {
                return reject(err);
              }
              try {
                data = JSON.parse(data);
              } catch(err) {
                return reject(err);
              }
              resolve(data);
            }
          );
        }).then(function(data) {
          var geo = [
            data.location.latitude,
            data.location.longitude,
            data.location.altitude,
          ];

          if (lastLatitude !== data.location.latitude ||
            lastLongitude !== data.location.longitude) {

            context.logger.debug(
              'Got #xee positions: %s http://maps.google.com/maps?q=%s,%s',
              geo.join(' '),
              data.location.latitude,
              data.location.longitude
            );

            require('../../app/utils/location.js')
              .getFormatedAddress(
                data.location.latitude,
                data.location.longitude,
                function(err, address) {
                  if(err) {
                    context.logger.error('Geolocation error', err);
                    return;
                  }
                  context.logger.debug(
                    'Notre #xee est au : %s @hackthemobility',
                    address
                  );
                }
              )
            ;
          }

          lastLatitude = data.location.latitude;
          lastLongitude = data.location.longitude;

          // Save the coordinates as an event
          return context.db.collection('events').findOneAndUpdate({
            'contents.type': 'xee-geo',
            'contents.trip_id': tripEvent._id,
            'create.seal_date': new Date(data.location.date),
          }, {
            $set: {
              'contents.geo': geo,
            },
            $setOnInsert: {
              'contents.trip_id': tripEvent._id,
              'contents.type': 'xee-geo',
              trip: tripEvent.trip,
              owner_id: user._id,
              created: controllersUtils.getDateSeal(data.location.date),
            },
          }, {
            upsert: true,
            returnOriginal: false,
          });
        });
      });
    }));
  });
}
