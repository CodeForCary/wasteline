(function () {
    "use strict";
    
    var q = require("q"),
        _ = require('lodash');
    
    var db = (function () {
        var Datastore = require('nedb');
        var dbfile = function (collection) {
            var path = __dirname + "/__data/";
            return path + collection + ".db"
        };

        var collections = {};
        ["Route", "Cycle", "Address", "User", "Notification"].forEach(function (entity) {
            collections[entity] = new Datastore({ filename: dbfile(entity), autoload: true });
        });

        return collections;
    })();

    var generateUniqueId = function () {
      var d = Date.now();
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      return uuid;
    };
    
    var stripDatabaseIds = function (collection) {
        _.forEach(collection, function (item) {
            delete (item["_id"]);
        });
    };
    
    var get = function (query) {
        var collection = this,
            deferred = q.defer();
        
        try {
            db[collection].find({}, function (err, items) {
                if (err || !items) {
                    console.log("No items found");
                }
                else {
                    console.log((items.length) + " items found");
                    stripDatabaseIds(items);
                }

                if (items.length && query && Object.keys(query).length) {
                  Object.keys(query).forEach(function (key) {
                    if (!isNaN(query[key])) {
                        query[key] = Number(query[key]);
                    }
                  });
                  items = _.find(items, query);
                }

                if (["Booking", "Invitation"].indexOf(collection) !== -1) {
                    get.apply("Occasion")
                        .then(function (occasions) {
                            var itemOccasionIds = _.pluck(items, "occasionId"),
                                filter = function (occasion) {
                                    return itemOccasionIds.indexOf(occasion.id) !== -1;
                                };

                            console.log("OccasionIds: " + itemOccasionIds.toString());

                            occasions = occasions.filter(filter);

                            deferred.resolve(occasions);
                        })
                        .catch(function (ex) {
                            console.log(ex);
                            deferred.reject("Service cannot load items");
                        });
                }
                else {
                    deferred.resolve(items);
                }
            });
        }
        catch (ex) {
            console.error(ex);
            deferred.reject(ex);
        }
        
        return deferred.promise;
    };

    var authenticate = function(credentials) {
        var deferred = q.defer();

        get.apply("User")
            .then(function (users) {
                var user = _.findWhere(users, credentials);
                if (user)
                    deferred.resolve({
                        sessionid: generateUniqueId(),
                        user: user
                    });
                else
                    deferred.reject("No matching user found");
            })
            .fail(function (reason) {
                console.error(reason);
                deferred.reject(reason);
            });

        return deferred.promise;
    }
    
    var service = {
        get: function (collection, query) {
            return get.call(collection, query);
        },
        getFoodTrucks: get.bind("FoodTruck"),
        getUsers:  get.bind("User"),
        authenticate: authenticate
    };
    
    module.exports = service;
})();
