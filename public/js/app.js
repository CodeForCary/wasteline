(function ($, _, moment, localforage, q) {
    $(initialize);
    
    function initialize() {
        var search = _.fromPairs(_.map((document.location.search || "?").substr(1).split("&"), function (p, i) {
            var a = [];
            if (p.indexOf("=") !== -1) {
                var pair = p.split("=");
                a = [decodeURIComponent(pair[0]), decodeURIComponent(pair[1].replace(/\+/g, " "))];
            }
            return a;
        }));
        
        if (search["q"]) {
            var address = search["q"] || "";
            $("form#address-form input[type=text]").eq(0).val(address.substring(0, address.indexOf(",") > 0 ? address.indexOf(",") : address.length));
            searchAddress(search["q"]).then(displayResult);
            $("#see-schedule").removeClass("hidden");
        }
        else {
            getLastAddress().then(function (value) {
                displayResult(value, true);
                if (value && value.address) {
                    $("form#address-form input[type=text]").eq(0).val(value.address.substring(0, value.address.indexOf(",")));
                    showLink("see-schedule");
                }
                else {
                    showLink("get-started");
                }
            }, function () {
                showLink("get-started");
            });
        }    
        $("form#address-form input[type=text]").eq(0).on("focus", function () {
            $(this).val("");
        });
        
        $.ajax({
            type: "GET",
            url: "/api/NextTwoWeeks",
            success: function (response) {
                if (Array.isArray(response)) {
                    var tbody = $(".calendar tbody").eq(0);
                    response.forEach(function (item, index) {
                        var rowNumber = Math.floor(index / 7);
                        var tableRow = $(tbody.find("tr").get(rowNumber) || 
                            $("<tr>").addClass(item.cycle.toLowerCase()).appendTo(tbody).get(0));
                        var td = $("<td>").text((new Date(item.day)).getDate());
                        if (item.isHoliday) {
                            td.addClass("holiday");
                            $("<p>").text(item.holiday).appendTo(td);
                        }
                        tableRow.append(td);
                    });
                }
                
                var startMonth = moment(_.first(response).day).format("MMMM YYYY"),
                    endMonth = moment(_.last(response).day).format("MMMM YYYY"),
                    title = startMonth !== endMonth ? startMonth.substring(0, startMonth.indexOf(" ")) + " to " + endMonth : startMonth;
                $(".calendar .title").text(title);
            },
            dataType: "json"
        });
    }
    
    function showLink(id) {
        _.delay(function () {
            $("#" + id).removeClass("hidden");
        }, 2000);
    }
    
    // Geolocate
    $("form#geolocate-form").on("click", "button", function (e) {
        var form = $(this.form);
        if (navigator && navigator.geolocation && navigator.geolocation.getCurrentPosition) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var latLong = [position.coords.latitude, position.coords.longitude].map(function (coord) {
                    return Number(coord).toFixed(5);
                }).toString().replace(",", ", ");
                form.find("input[type=text]").eq(0).val(String(latLong));    
                searchLatLong([position.coords.latitude, position.coords.longitude])
                    .then(displayResult,
                    function () {
                        $("<a>").attr("href", "#notFoundModal").attr("data-toggle", "modal").click();
                    });
            },
            function (error) { console.error(error); },
            {
                timeout: 15000,
                enableHighAccuracy: true,
                maximumAge: 10000
            });
        }
    });
    
    // Search by Address
    $("form#address-form").on("click", "button", function (e) {
        var form = $(this.form),
            button = form.find("button");
            
        var address = form.find("input[type=text]").eq(0).val();
        button.prop("disabled", true);
        searchAddress(address)
            .then(displayResult)
            .finally(function () {
                button.prop("disabled", false);
            });
    });
    $("form#address-form").on("keyup mouseup focus", "input[type=text]", function() { 
        var form = $(this.form);
        form.find("button:last").prop("disabled", ($(this).val() || "") === "");
    });    
    
    // Search by Parameters
    $("form#specify-form").on("click", "button.primary", function (e) {
        var form = $(this.form);
            
        var cycle = form.find("button.selected").eq(0).text() || "",
            weekday = form.find(".btn-group:last button").text();
            
        displayResult({
            address: cycle + " cycle, " + weekday + " pick-up",
            cycle: cycle.toLowerCase(),
            day: weekday
        });
    });
    $("form#specify-form").on("click", ".btn-group[data-toggle=tab] button", function() { 
        var form = $(this.form);
        form.find(".btn-group button:not(.dropdown-toggle)").removeClass("selected");
        $(this).addClass("selected").trigger("blur"); 
        form.find("button:last").prop("disabled", form.find(".selected").length < 2);
    });
    $("form#specify-form").on("click", ".dropdown-item", function() { 
        var form = $(this).closest("form");
        var option = $(this);
        option.parent().prev(".dropdown-toggle").text(option.text()).addClass("selected");
        form.find("button:last").prop("disabled", form.find(".selected").length < 2);
    });
    
    var searchAddress = function (address) {
        var deferred = q.defer();
        
        findAddressInCache(address).then(deferred.resolve, function () {
            $.ajax({
                type: "POST",
                url: "/api/Search",
                data: { address: address },
                success: function (response) {
                    // Persist the results data locally
                    var data = _.extend(response, { timestamp: (new Date()).valueOf() });
                    localforage.setItem(response.address, data, function () {
                        console.info("Data saved for " + response.address);
                    });
                    
                    deferred.resolve(data);
                },
                error: deferred.reject,
                dataType: "json"
            });               
        });
        
        return deferred.promise;
    }; 
       
    var searchLatLong = function (coords) {
        var deferred = q.defer();
        
        $.ajax({
            type: "POST",
            url: "/api/Locate",
            data: { "coords": coords },
            success: function (response) {
                if (!response.error) {
                    // Persist the results data locally
                    var data = _.extend(response, { timestamp: (new Date()).valueOf() });
                    localforage.setItem(response.address, data, function () {
                        console.info("Data saved for " + response.address);
                    });
                    
                    deferred.resolve(data);
                }
                else  {
                    deferred.reject(response.error);
                }
            },
            error: deferred.reject,
            dataType: "json"
        });  
        
        return deferred.promise;
    };
    
    var getLastAddress = function () {
        var deferred = q.defer();
        localforage.keys(function (err, keys) {
            if (keys && keys.length) {
                var lastKey = _.last(keys);
                localforage.getItem(lastKey, function (err, value) {
                    if (!err && typeof(value) === "object") {
                        deferred.resolve(value);
                    }
                    else {
                        deferred.reject();
                    }
                });
            }
            else {
                deferred.reject();
            }
        });
        
        return deferred.promise;
    };
    
    var findAddressInCache = function (address) {
        var deferred = q.defer();
        localforage.keys(function (err, keys) {
            if (keys && keys.length) {
                var addressMatches = _.filter(keys, function (key) {
                    return key.substring(0, address.length).toUpperCase() === address.toUpperCase();
                });
                if (addressMatches.length) {
                    localforage.getItem(addressMatches[0], function (err, value) {
                        if (!err && typeof(value) === "object") {
                            deferred.resolve(value);
                        }
                        else {
                            deferred.reject();
                        }
                    });
                }
                else {
                    deferred.reject();
                }
            }
            else {
                deferred.reject();
            }
        });
        
        return deferred.promise;
    };
    
    var displayResult = function (data, preventScrolling) {
        var headerCells = $(".calendar thead th");
        var index = (function () {
            var idx = -1;
            headerCells.each(function (i, headerCell) {
                var text = $(headerCell).text();
                if (data.day.substring(0, text.length).toUpperCase() === text.toUpperCase()) {
                    idx = i;
                    return false;
                }
                return true;
            });
            return idx;
        })();
        
        $(".calendar tbody tr td:not(.holiday)").find("p").remove();
        $("#schedule #address").empty().text(data.address);
        
        ["blue", "yellow"].forEach(function (cycle, i) {
            var td = $(".calendar tbody tr." + cycle + " td").eq(index);
            if (td.parent().find(".holiday").index() >= td.index()) {
                td = td.prev("td");
            }
            if (cycle === data.cycle.toLowerCase()) {
                $("<p>").text("Garbage and Recycling").appendTo(td);
            }
            else {
                $("<p>").text("Garbage").appendTo(td);
            }
        });
        
        !!preventScrolling || $("a[href=#schedule]").click();
        $("section#schedule .hidden").removeClass("hidden");
    }
    
})(window.jQuery, window._, window.moment, window.localforage, window.Q);