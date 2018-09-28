var mongoose = require('mongoose'),
    LebonCoin = require('./leboncoin.js'),
    ParuVendu = require('./paruvendu.js'),
    Pap = require('./pap.js'),
    SeLoger = require('./seloger.js'),
    LogicImmo = require('./logicimmo.js'),
    locations = require('./location.js'),
    House = mongoose.model('House');

function Job() {
    'use strict';

}


Job.crawl = function () {
    'use strict';

    locations.forEach(function(location){

        new LebonCoin(location).proceed();

        new ParuVendu(location).proceed();

        new SeLoger(location).proceed();

        new LogicImmo(location).proceed();
    });

    locations.forEach(function(location, index){

        setTimeout(function () {
            new Pap(location).proceed();
        }, index * 5000);
    });
};

Job.clean = function () {
    'use strict';
    //todo
    House.remove({
        time: { $lt: Date.now() - 86400000}
    }, function() {
        console.log('clean done.');
    });
};

// export the class
module.exports = Job;
