/* global process */
(function () {
    "use strict";
    var Feed = require('feed');
    
    var q = require("q"),
        _ = require('lodash'),
        moment = require('moment');
    
    var repo = require("./repository");

    var feed = new Feed({
        title: 'WasteLine',
        description: 'Garbage and recycling scheduling information and notifications for residents of the Town of Cary, North Carolina',
        link: 'http://wasteline.net/',
        image: 'http://wasteline.net/img/logo.png',
        copyright: 'This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License',
        //updated: new Date(2013, 06, 14), // optional, default = today
        author: {
            name: 'WasteLine NC',
            email: 'feeds@wasteline.net',
            link: 'http://wasteline.net/#about'
        }
    });
    
    var service = {
        getFeed: function (code) {
            var deferred = q.defer();
            repo.get("Notification", { code: code }).then(function (notifications) {
                if (notifications && notifications.length === 1) {
                    var notification = notifications[0];
                    var now = moment(),
                        when = (function () {
                            var then = moment();
                            then.add(1, "day");
                            then.set("hour", Number(notification.alert.time.substring(0, notification.alert.time.indexOf(":"))));
                            then.set("minute", Number(notification.alert.time.substring(notification.alert.time.indexOf(":") + 1)));
                            then.set("second", 0);
                            then.set("weekday", Number(notification.alert.day));
                            return then;
                        })();
                    
                    var hoursFromNow = when.diff(now) / 3600000;       
                    
                    notification.feed = _.clone(feed);
                    
                    notification.feed.items = [];
                    
                    if (hoursFromNow >= 0 && hoursFromNow <= 48) {
                        notification.feed.addItem({
                            title: "Garbage pick-up",
                            link: "http://wasteline.net/notifications/" + code,
                            description: "Garbage only",
                            author: [{
                                name: 'Code for Cary',
                                email: 'info@codeforcary.org',
                                link: 'http://codeforcary.org'
                            }],
                            date: when.toDate(),
                            guid: "http://wasteline.net/notifications/" + code + "#" + when.format("YYYYMMDDHHmm")
                        });
                    }
                    deferred.resolve(notification);
                }
                else {
                    deferred.reject("Notification not found");
                }
            });                
            return deferred.promise;
        }
    };
    
    module.exports = service;
})();