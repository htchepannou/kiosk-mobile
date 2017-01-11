angular.module('starter.controllers', ['angularMoment'])


  /* ==================================================================================== */
  /*                                                                                      */
  /*                             CONTROLLERs                                              */
  /*                                                                                      */
  /* ==================================================================================== */


  .controller('AppCtrl', function ($scope, $ionicModal, $timeout) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});

    // Form data for the login modal
    $scope.loginData = {};

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.modal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.modal.hide();
    };

    // Open the login modal
    $scope.login = function () {
      $scope.modal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function () {
      console.log('Doing login', $scope.loginData);

      // Simulate a login delay. Remove this and replace with your login
      // code if using a login system
      $timeout(function () {
        $scope.closeLogin();
      }, 1000);
    };
  })


  .controller('ArticleListCtrl', function ($scope, $location, $ionicScrollDelegate, kioskService) {
    $scope.page = 0;
    $scope.more = false;
    $scope.articles = [];
    $scope.showScrollToTopButton = false;


    /* ========= PUBLIC METHODS ============ */
    $scope.scrollToTop = function () { //ng-click for back to top button
      $scope.reload(function () {
        $ionicScrollDelegate.scrollTop();
        $scope.sttButton = false;  //hide the button when reached top
      });
    };

    $scope.getScrollPosition = function () {
      //monitor the scroll
      var moveData = $ionicScrollDelegate.getScrollPosition().top;

      if (moveData > 150) {
        $scope.$apply(function () {
          $scope.showScrollToTopButton = true;
        });//apply
      } else {
        $scope.$apply(function () {
          $scope.showScrollToTopButton = false;
        });//apply
      }
    };

    $scope.read = function (id) {
      console.log('read', id);
      $location.path('/app/articles/' + id);
    };

    $scope.reload = function (callback) {
      $scope.page = 0;
      $scope.articles = [];
      $scope.__load(0, function () {
        $scope.$broadcast('scroll.refreshComplete');
        if (callback) {
          callback();
        }
      });
    };

    $scope.loadMore = function () {
      $scope.__load($scope.page + 1, function () {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      });
    };

    $scope.canLoadMore = function () {
      return $scope.more;
    }


    /* ========= PRIVATE METHODS ============ */
    $scope.__load = function (page, callback) {
      kioskService.list(page, function (articles) {
        if (articles.length > 0) {
          $scope.articles = $scope.articles.concat(articles);
          $scope.page = page;
          $scope.more = true;
        } else {
          $scope.more = false;
        }

        if (callback) {
          callback();
        }
      });

    };


    /* ========= MAIN ============ */
    $scope.reload();
  }
)

  .
  controller('ArticleCtrl', function ($scope, $stateParams, $cordovaSocialSharing, kioskService) {
    $scope.article = {};
    $scope.content = '';


    /* =========== PUBLIC ============= */
    $scope.share = function (article) {
      $cordovaSocialSharing.share(article.url, article.title, null, article.url);
    };


    /* =========== MAIN ============= */
    kioskService.get($stateParams.articleId, function (article, content) {
      $scope.article = article;
      $scope.content = content;
    });
  })


  /* ==================================================================================== */
  /*                                                                                      */
  /*                             FACTORY                                                  */
  /*                                                                                      */
  /* ==================================================================================== */
  .service('kioskService', function ($http) {
    this.api = 'http://kiosk-api.tchepannou.io';
    this.articles = {};

    this.list = function (page, callback) {
      var url = this.api + '/v1/articles?page=' + page;
      var cache = this.articles;

      this.__get(url,
        function (data) {
          for (var i = 0, len = data.articles.length; i < len; i++) {
            var article = data.articles[i];
            cache[article.id] = article;
          }

          callback(data.articles);
        }
      );
    };

    this.get = function (id, callback) {
      var article = this.articles[id];
      console.log(id, article);
      this.__get(article.contentUrl, function (data) {
        callback(article, data);
      });
    }

    this.__get = function (url, successCallback, errorCallback) {
      $http.get(url)
        .then(
        function (response) {
          console.log('GET ' + url, response.data);

          successCallback(response.data);
        },
        function (error) {
          console.log('ERROR ' + url, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );

    }
  })

  /* ==================================================================================== */
  /*                                                                                      */
  /*                             FILTERS                                                  */
  /*                                                                                      */
  /* ==================================================================================== */

  .filter("html", ['$sce', function ($sce) {
    return function (htmlCode) {
      return $sce.trustAsHtml(htmlCode);
    }
  }])


;
