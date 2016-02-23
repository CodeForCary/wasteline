(function () {
 "use strict";

  var rp = require("request-promise"),
    _ = require("lodash"),
    q = require("q");

  require("stringformat").extendString("format");

  var geocoder = (function (baseUrl) {
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
      getCoordinates: function (address) {
      	if (typeof address === "string") {
	        address = address.replace(/[^\w\d\s\.\#\,]/g, "").replace(/\s+/g, " ");
	    }
	    else {
	    	throw(new Error("Invalid address argument - must be a string"));
	    }

        var deferred = q.defer();

        try {
        request({
	        method: "GET",
	        uri: "{0}?sensor=false&address={1}".format(baseUrl, encodeURIComponent(address))
	      }).then(function (response) {
	      	try {
                var json = JSON.parse(response);
                if (json && json.results && json.results.length && json.results[0].geometry && json.results[0].geometry.location) {
                	deferred.resolve(json.results[0].geometry.location);
                }
                else {
                	deferred.reject("Unexpected JSON response format: results[0].geometry.location not found");
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
  })("https://maps.google.com/maps/api/geocode/json");

  module.exports = geocoder;
})();