(function() {
  'use strict';

  angular
    .module('app.trips')
    .controller('TripCtrl', TripCtrl);

  TripCtrl.$inject = ['$scope', '$state', '$stateParams', 'tripsFactory', 'profile'];
  /* @ngInject */
  function TripCtrl($scope, $state, $stateParams, tripsFactory, profile) {
    var idTrip = $stateParams.tripId;

    $scope.goToMember = goToMember;

    activate();

    function activate() {
      $scope.trip = tripsFactory.get(idTrip);
    }
    function goToMember(member) {
      $state.go('app.member', { memberId: member.id });
    }
  }

})();
