var express = require('express'),
    mongoose = require('mongoose'),
    LebonCoin = require('../adapter/leboncoin.js'),
    locations = require('../adapter/location.js');

var router = express.Router(),
    House = mongoose.model('House');

router.get('/', function (req, res, next) {
    'use strict';

    var adapters = [{name: 'LeBonCoin'}, {name: 'LogicImmo'}, {name: 'PAP'}, {name: 'ParuVendu'}, {name: 'SeLoger'}],
        callbacks = adapters.length,
        callback = function () {
            callbacks--;
            if(callbacks === 0){
                adapters.sort(function(a, b) {
                    return b.count - a.count;
                });

                res.render('adapter', {
                    title: 'Adapter',
                    models: adapters,
                    count: adapters.length
                });
            }
    };

    adapters.forEach(function (adapter, index){
        House.find({
            adapter: adapter.name
        }).count(function(err, count){
            if (err) {
                adapters[index].count = 0;
                callback();
            } else {
                adapters[index].count = count;
                callback();
            }
        });
    });
});

router.get('/sync/LeBonCoin', function (req, res, next) {

    locations.forEach(function(location){
        new LeBonCoin(location).proceed();
    });

    res.send('Sync LeBonCoin in progress');

});

module.exports = router;
