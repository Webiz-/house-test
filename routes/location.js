var express = require('express'),
    mongoose = require('mongoose'),
    locations = require('../adapter/location.js');

var router = express.Router(),
    House = mongoose.model('House');

router.get('/', function (req, res, next) {
    'use strict';

    var callbacks = locations.length,
        callback = function () {
            callbacks--;
            if(callbacks === 0){
                locations.sort(function(a, b) {
                    return b.count - a.count;
                });

                res.render('location', {
                    title: 'Location',
                    models: locations,
                    count: locations.length
                });
            }
    };

    locations.forEach(function (location, index){
        House.find({
            location: location.name,
            hidden: false
        }).count(function(err, count){
            if (err) {
                locations[index].count = 0;
                callback();
            } else {
                locations[index].count = count;
                callback();
            }
        });
    });
});

module.exports = router;
