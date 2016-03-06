(function () {
   "use strict";

	var _ = require("lodash"),
        moment = require("moment-timezone"),
        geocoder = require("./geocoder"),
		q = require("q");

	require("stringformat").extendString("format");
    
    var schedules = {
        "blue": {
            start: moment("2015-11-01")
        },
        "yellow": {
            start: moment("2015-11-08")
        }
    };
    
    var year = (new Date()).getFullYear();
    
    var holidays = {
        "Employee Appreciation Day": (function (year) {
                var first = new Date(year, 2, 1),
                    dayOfWeek = first.getDay();
                return moment("{0}-03-{1}".format(year, ("0" + String(1 + (12 - dayOfWeek) % 7)).slice(-2)));
            })(year),
        "New Year’s Day": moment("{0}-01-01".format(year)),
        "Independence Day": moment("{0}-07-04".format(year)),
        "Thanksgiving": (function (year) {
                var first = new Date(year, 10, 1),
                    dayOfWeek = first.getDay();
                return moment("{0}-11-{1}".format(year, 22 + (11 - dayOfWeek) % 7));
            })(year),
        "Christmas": moment("{0}-12-25".format(year))
    };
    
    var geocodeAddress = function(address) {
        var deferred = q.defer();
        geocoder.getCoordinates(address).then(function(result) {
            if (result && result.lat && result.lng) {
              deferred.resolve({
                address: address,
                coordinates: [result.lat, result.lng]
              });
            } else {
              deferred.reject("No coordinates returned");
            }
          },
          deferred.reject);
        return deferred.promise;
      };

	var service = (function () {

		var isHolidayWeek = function (date) {
            return getHolidayWeekday(date) !== null;
        };

		var getHolidayWeekday = function (date) {
            var today = moment(date || (new Date())).tz("America/New_York").startOf("day"),
                startOfWeek = today.clone().subtract(today.weekday(), "days"),
                weekdayRange = [startOfWeek.clone().add(1, "days"), startOfWeek.clone().add(6, "days")];
                
            var holidayInWeek = null;
                
            var hasHolidayAfterMonday = _.some(holidays, function (holiday) {
                var isInWeek = holiday.isBetween(weekdayRange[0].subtract(1, "second"), weekdayRange[1].add(1, "second")) && holiday.weekday() > 1;
                if (isInWeek) {
                    holidayInWeek = holiday;
                } 
                return isInWeek;
            });
            
            return hasHolidayAfterMonday ? holidayInWeek : null;
        };

		var isRecyclingWeek = function (cycle, day) {
            var today = moment(day || (new Date())).tz("America/New_York").startOf("day"),
                startOfWeek = today.clone().subtract(today.weekday(), "days");
                
            var seedRecyclingWeek = schedules[String(cycle).toLowerCase()].start;
            
            var weeksAgo = seedRecyclingWeek.diff(startOfWeek, "weeks");
            
            var isRecycling = weeksAgo % 2 === 0;
            
            return isRecycling;
        };
        
		var getNextTwoWeeks = function (day) {
            var today = moment().tz("America/New_York").startOf("day");
            
            if (today.weekday() >= 6) {
                today = today.add(1, "days");
            }
            
            var startOfWeek = today.clone().subtract(today.weekday(), "days"),
                nextTwoWeeks = Array.apply(0, new Array(14)).map(function (o, i) {
                    try {
                        var day = startOfWeek.clone().add(i, "days"),
                            holidayInWeek = getHolidayWeekday(startOfWeek.clone().add(Math.floor(i / 7), "weeks"));
                        return {
                            day: day,
                            cycle: isRecyclingWeek("blue", day) ? "Blue" : "Yellow",
                            isHoliday: holidayInWeek !== null ? (holidayInWeek.date() === day.date()) : false,
                            holiday: _.first(Object.keys(holidays), function (name) {
                                return holidayInWeek ? (holidayInWeek.date() === holidays[name].date() && holidayInWeek.month() === holidays[name].month()) : null
                            }) || null 
                        };
                    }
                    catch (ex) {
                        console.log(ex);
                    }
                });
            
            return nextTwoWeeks;
        };

		return {
            geocodeAddress: geocodeAddress,
			isHolidayWeek: isHolidayWeek,
            isRecyclingWeek: isRecyclingWeek,
            getNextTwoWeeks: getNextTwoWeeks
		};
	})();

	module.exports = service;
})();