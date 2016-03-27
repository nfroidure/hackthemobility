(function() {
  'use strict';

  angular
    .module('app.authentication')
    .factory('AuthService', AuthService);

  AuthService.$inject = ['$http', 'ENV', '$q'];
  /* @ngInject */
  function AuthService($http, ENV, $q) {
    var profileDeffered = $q.defer();
    var service = {
      getProfile: getProfile,
      setProfile: setProfile,
      deleteProfile: deleteProfile,
      log: log,
      signup: signup,
      logout: logout,
    };
    $http.get(ENV.apiEndpoint + '/api/v0/profile')
      .then(function(response) {
        if(200 !== response.status) {
          throw response;
        }
        profileDeffered.resolve(response.data);
      }).catch(profileDeffered.reject);
    return service;

    ////////////////

    function getProfile() {
      return profileDeffered.promise;
    }
    function setProfile(profile) {
      return getProfile().then(function(profile) {
        return $http.put(
          ENV.apiEndpoint + '/api/v0/users/' + profile._id,
          profile
        ).then(function(response) {
          if(201 !== response.status) {
            throw response;
          }
          profileDeffered = $q.defer();
          profileDeffered.resolve(response.data);
        });
      });
    }
    function deleteProfile(profile) {
      return getProfile().then(function(profile) {
        return $http.delete(
          ENV.apiEndpoint + '/api/v0/users/' + profile._id
        )
        .then(function(response) {
          throw response;
        })
        .catch(function(response) {
          if(410 !== response.status) {
            throw response;
          }
          return response;
        })
        .then(function() {
          profileDeffered = $q.defer();
          profileDeffered.reject();
        });
      });
    }
    function log(credentials) {
      return $http.post(ENV.apiEndpoint + '/api/v0/login', credentials)
        .then(function(res) {
          if(200 !== res.status) {
            throw res;
          }
          profileDeffered = $q.defer();
          profileDeffered.resolve(res.data);
        });
    }

    function logout() {
      return $http.post(ENV.apiEndpoint + '/api/v0/logout')
        .then(function(response) {
          if(204 !== response.status) {
            throw response;
          }
          profileDeffered = $q.defer();
          profileDeffered.reject();
        });
    }

    function signup(credentials) {
      return $http.post(ENV.apiEndpoint + '/api/v0/signup', credentials)
        .then(function(res) {
          if(201 !== res.status) {
            throw res;
          }
          profileDeffered = $q.defer();
          profileDeffered.resolve(res.data);
        });;
    }
  }

})();
