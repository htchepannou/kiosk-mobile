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


  .controller('TimelineCtrl', function ($scope, $location, $ionicScrollDelegate, articleService, eventService) {
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
      $location.path('/app/article/' + id);
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
    };


    /* ========= PRIVATE METHODS ============ */
    $scope.__load = function (page, callback) {
      articleService.list(page, function (articles) {
        if (articles) {
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

      eventService.push('Timeline.Load', 'Page.Timeline', -1, page);
    };


    /* ========= MAIN ============ */
    $scope.reload();
  })


  .controller('ArticleCtrl', function ($scope, $stateParams, $cordovaSocialSharing, articleService, eventService) {
    $scope.article = {};
    $scope.loading = false;
    $scope.content = '';


    /* =========== PUBLIC ============= */
    $scope.share = function (article) {
      $cordovaSocialSharing.share(article.url, article.title, null, article.url);
      eventService.push('Article.Share', 'Page.Article', article.id);
    };

    $scope.navigate = function (article) {
      window.open(article.url, '_system', 'location=no');
      eventService.push('Article.Navigate', 'Page.Article', article.id, article.url);
    };

    $scope.open = function () {
      $scope.loading = true;

      $scope.article = articleService.getArticle($stateParams.articleId);

      console.log('loading content...');
      articleService.loadContent($scope.article, function (content) {
        $scope.content = content;
        $scope.loading = false;
      });

      eventService.push('Article.Open', 'Page.Article', $stateParams.articleId);
    };


    /* =========== MAIN ============= */
    $scope.open();
  })


  /* ==================================================================================== */
  /*                                                                                      */
  /*                             FACTORY                                                  */
  /*                                                                                      */
  /* ==================================================================================== */
  .service('articleService', function ($http, configService, dbService) {
    this.api = configService.api;
    this.articles = {};

    this.list = function (page, callback) {
      var url = this.api + '/v1/articles?page=' + page;

      this.httpGet(url,
        function (data) {

          if (data) {
            /* update the article cache */
            for (var i = 0, len = data.articles.length; i < len; i++) {
              var article = data.articles[i];
              dbService.put(article.id + '_meta', JSON.stringify(article));
            }

            callback(data.articles);
          } else {
            callback();
          }

        }
      );
    };

    this.getArticle = function (id) {
      return JSON.parse(dbService.get(id + '_meta'));
    };

    this.loadContent = function (article, callback) {
      var key = article.id + '_content';
      var content = dbService.get(key);
      if (content) {
        console.log('content of ' + article.url + ' loaded from cache');
        callback(content);
      } else {
        this.httpGet(article.contentUrl, function (data) {
          console.log('content of ' + article.url + ' loaded from server');
          dbService.put(key, data);
          callback(data);
        });
      }
    };

    this.httpGet = function (url, successCallback, errorCallback) {
      console.log('GET ' + url);
      $http.get(url)
        .then(
        function (response) {
          successCallback(response.data);
        },
        function (error) {
          console.log('ERROR ' + url, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );
    };
  })

  .service('eventService', function ($http, $cordovaDevice, configService) {
    this.api = configService.api;

    this.push = function (name, page, articleId, param1, param2) {
      //try {
      //
      //  var evt = {
      //    name: name,
      //    page: page,
      //    articleId: articleId,
      //    timestamp: Date.now(),
      //    param1: param1 ? param1 : null,
      //    param2: param2 ? param2 : null,
      //    device: this.device
      //  };
      //
      //  var url = this.api + '/v1/event';
      //  $http.post(url, evt).then(
      //    function () {
      //      console.log('POST ', url, JSON.stringify(evt));
      //    },
      //    function (err) {
      //      console.log('POST ', url, JSON.stringify(evt), err);
      //    }
      //  );
      //
      //} catch (e) {
      //  // Ignore - We don't want the tracking to make any transaction fails!
      //  console.log('ERROR', e);
      //}

    };

    this.device = function () {
      try {

        return {

          uuid: $cordovaDevice.getUUID(),
          manufacturer: $cordovaDevice.getManufacturer(),
          model: $cordovaDevice.getModel(),
          platform: $cordovaDevice.getPlatform(),
          version: $cordovaDevice.getVersion()

        };

      } catch (e) {
        // Ignore - This will fail in the browser
        return null;
      }

    }
  })

  .service('dbService', function () {
    this.put = function (key, value) {
      window.localStorage.setItem('kiosk_' + key, value);
    };

    this.get = function (key) {
      return window.localStorage.getItem('kiosk_' + key);
    };

  })

  .service('configService', function () {
    this.api = 'http://kiosk-api.tchepannou.io';
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
