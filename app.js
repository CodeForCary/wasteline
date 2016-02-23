(function () {
    var service = require("./service"),
        proxy = require("./api-proxy"),
        q = require("q");
    
    console.log(service.isHolidayWeek());
    
    console.log(service.isHolidayWeek("2016-11-22"));
    
    console.log(service.isHolidayWeek("2011-07-05"));
    
    service.geocodeAddress("205 CANIFF LN, CARY, NC 27519").then(function (result) {
        console.log(result.coordinates);
        
        proxy.getCycle(result.coordinates).then(function (result) {
           console.log(result); 
        }, function (error) {
            console.error(error);
        });
    });
})();