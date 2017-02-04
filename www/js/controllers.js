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
        });
      } else {
        $scope.$apply(function () {
          $scope.showScrollToTopButton = false;
        });
      }
    };

    $scope.read = function (id) {
      $location.path('/app/article/' + id);
    };

    $scope.reload = function (callback) {
      $scope.page = 0;
      $scope.articles = [];

      var success = function () {
        $scope.$broadcast('scroll.refreshComplete');
        if (callback) {
          callback();
        }
      };

      $scope.__load(0, success);
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
      var success = function (articles) {
        if (articles && articles.length > 0) {
          $scope.articles = $scope.articles.concat(articles);
          $scope.page = page;
          $scope.more = true;

          articleService.setTimeline($scope.articles);
        } else {
          $scope.more = false;
        }

        if (callback) {
          callback();
        }
      };

      var error = function () {
        if (page == 0) {
          $scope.articles = articleService.getTimeline();
          $scope.page = page;
          $scope.more = true;
        }
      };

      articleService.list(page, success, error);

      eventService.push('Timeline.Load', 'Page.Timeline', -1, page);
    };


    /* ========= MAIN ============ */
    $scope.reload();
  })


  .controller('ArticleCtrl', function ($scope, $stateParams, $cordovaSocialSharing, articleService, eventService) {
    $scope.article = {};
    $scope.content = '';
    $scope.isLoading = false;


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
      $scope.isLoading = true;

      $scope.article = articleService.getArticle($stateParams.articleId);

      articleService.loadContent($scope.article, function (content) {
        $scope.content = content;
        $scope.isLoading = false;
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
  .service('articleService', function ($http, dbService, httpService) {
    this.articles = null;

    this.list = function (page, callback, error) {

      httpService.get('/v1/articles?page=' + page,
        function (data) {

          if (data) {
            callback(data.articles);
          } else {
            callback();
          }

        },
        error
      );
    };

    this.getArticle = function (id) {
      var articles = this.getTimeline();
      for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        if (article.id == id) {
          return article;
        }
      }
    };

    this.setTimeline = function (articles) {
      dbService.put('timeline', JSON.stringify(articles));
      this.articles = null;
    };

    this.getTimeline = function () {
      if (this.article == null) {
        this.articles = JSON.parse(dbService.get('timeline'));
      }
      return this.articles;
    };

    this.loadContent = function (article, callback) {
      var key = article.id + '_content';
      var content = dbService.get(key);
      if (content) {
        console.log('ArticleService - Loading content from DB ', article.url);
        callback(content);
      } else {
        httpService.get(article.contentUrl, function (data) {
          if (data) {
            console.log('ArticleService - Loading content from server', article.url);
            dbService.put(key, data);
            callback(data);
          }
        });
      }
    };
  })

  .service('eventService', function ($http, $cordovaDevice, httpService) {

    this.push = function (name, page, articleId, param1, param2) {
      try {

        var evt = {
          name: name,
          page: page,
          articleId: articleId,
          timestamp: Date.now(),
          param1: param1 ? param1 : null,
          param2: param2 ? param2 : null,
          device: this.device
        };

        //httpService.post('/v1/event', evt);

      } catch (e) {
        // Ignore - We don't want the tracking to make any transaction fails!
        console.log('ERROR', e);
      }

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

  .service('httpService', function ($http, configService) {
    this.api = configService.api;

    this.get = function (path, callback, error) {
      var url = path.lastIndexOf('http', 0) == 0 ? path : this.api + path;
      console.log('GET ' + url);
      $http.get(url)
        .then(
        function (response) {
          if (callback) {
            callback(response.data);
          }
        })
        .catch(function (err) {
          console.log('HttpService : ERROR ', url, err);
          if (error) {
            error();
          }
        });
    };

    this.post = function (path, data) {
      var url = this.api + path;
      $http.post(url, data).then(
        function () {
          console.log('POST ', url, JSON.stringify(data));
        }
      );
    }
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
