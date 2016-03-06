/* global process, require */
(function () {
    var moment = require("moment");
    var repo = require("./repository");
    
    // Your accountSid and authToken from twilio.com/user/account
    // Need to be added to twilio-config.json with accountSid and authToken properties defined
    var config = require("./twilio-config.json");
    var client = require("twilio")(config.accountSid, config.authToken);
    
    var tomorrow = moment().add(1, "day"),
        query = { day: tomorrow.get("weekday") };
    
    console.info("QUERY", query);
    
    repo.get("Notification", query).then(function (notifications) {
        console.info(notifications.length, "notifications to send");
        notifications.forEach(function (notification) {
            console.info("Sending SMS message", notification.number);
            client.messages.create({
                body: "Tomorrow is pick-up day!",
                to: notification.number,
                from: "+17047692783"
            }, function(err, message) {
                process.stdout.write(message.sid);
            });
        });
    });
})();