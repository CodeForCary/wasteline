/* global process */
(function () {
 "use strict";

  var rp = require("request-promise"),
    _ = require("lodash"),
    Buffer = require('buffer/').Buffer,
    q = require("q");

  require("stringformat").extendString("format");
  
  var proxy = (function (baseUrl) {
  	var cookieJar = rp.jar(),
      request = rp.defaults({ 
      proxy: process.env.WASTELINE_PROXY || null, 
      jar: cookieJar,
      rejectUnauthorized: false,
      followRedirect: true,
      followAllRedirects: true,
      headers: {
        "accept": "application/json, text/javascript, */*",
        "user-agent": "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
        "dnt": "1",
        "accept-language": "en-US,en;q=0.8",
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded",
        "connection": "keep-alive",
        "origin": baseUrl,
        "referer": baseUrl
      }
    });

    return {
      getCycle: function (coordinates) {
        var deferred = q.defer();

        try {
        request({
	        method: "GET",
	        uri: "{0}&geofilter.distance={1}%2C{2}%2C0".format(baseUrl, coordinates[0], coordinates[1])
	      }).then(function (response) {
	      	try {
                var json = JSON.parse(response);
                if (json && json.records && json.records.length && json.records[0].fields && Object.keys(json.records[0].fields).length) {
                	deferred.resolve(json.records[0].fields);
                }
                else {
                	deferred.reject("Unexpected JSON response format: records[0].fields not found");
                }
              }
              catch (ex) {
                deferred.reject("Cannot parse response as JSON");
              }
	      }, deferred.reject)
	        .catch(function (ex) {
	        	deferred.reject(ex.message);
	        });
	        }
              catch (ex) {
                deferred.reject(ex.message);
              }

        return deferred.promise;
      }
    };
  })("https://data.townofcary.org/api/records/1.0/search/?dataset=solid-waste-and-recycling-collection-routes&rows=1");

  module.exports = proxy;
})();