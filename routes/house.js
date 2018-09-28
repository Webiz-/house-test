var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    LebonCoin = require('../adapter/leboncoin.js'),
    ParuVendu = require('../adapter/paruvendu.js'),
    Pap = require('../adapter/pap.js'),
    SeLoger = require('../adapter/seloger.js'),
    LogicImmo = require('../adapter/logicimmo.js'),
    locations = require('../adapter/location.js'),
    Job = require('../adapter/job.js');

var router = express.Router(),
    House = mongoose.model('House');

router.get('/', function (req, res, next) {
    House
        .find({
            hidden: false
        })
        .sort({
            price: +1 //Sort by Date Added DESC
        })
        .exec(function (err, models) {
            if (err) {
                return console.error(err);
            }

            models.forEach(function (model, index) {
                models[index].price_formated = model.price.format(0, 3, ' ', '');
            });

            //res.send(models);
            res.render('house', {
                title: 'Maisons',
                models: models,
                count: models.length
            });
        });
});

router.get('/favorite', function (req, res, next) {
    House
        .find({
            favorite: true,
            hidden: false
        })
        .sort({
            price: +1 //Sort by Date Added DESC
        })
        .exec(function (err, models) {
            if (err) {
                return console.error(err);
            }

            models.forEach(function (model, index) {
                models[index].price_formated = model.price.format(0, 3, ' ', '');
            });

            //res.send(models);
            res.render('house', {
                title: 'Maisons favorite',
                models: models,
                count: models.length
            });
        });
});

router.get('/test', function (req, res, next) {
    var request = require('request');

    var url = 'http://www.seloger.com/annonces/achat/maison/bois-d-arcy-78/105315187.htm';//'http://www.seloger.com/annonces/achat/maison/bois-d-arcy-78/105315187.htm?ci=780073&idtt=2&idtypebien=2&org=advanced_search&pxmax=370000&surf_terrainmin=50&surfacemin=70&bd=Li_LienAnn_1';

    new SeLoger({codePostal: 78390, name: 'Bois-d\'Arcy', papId: 39134, codeINSEE: 78073, logicImmoId: 3859}).extractDescription(url, function () {

    });


    res.send('TEST');
});


router.get('/sync2', function (req, res, next) {

    locations.forEach(function(location){
        new SeLoger(location).proceed();
    });

    res.send('Sync2 in progress');

});


router.get('/sync', function (req, res, next) {

    Job.crawl();

    res.send('Sync in progress');

});

router.get('/flush', function (req, res, next) {

   Job.clean();
   res.send('Flushed');
});

router.get('/reset', function (req, res, next) {
   House.remove({}, function() {
        res.send('Reseted');
    });
});

router.put('/', function (req, res, next) {
    House.update({
        _id: req.body.id
    }, {
        favorite: req.body.favorite
    }, {

    }, function(err) {
        if (err) {
            console.log(err);
        }
        res.send(true);
    });
});


router.delete('/', function (req, res, next) {
    House.update({
        _id: req.body.id
    }, {
        hidden: true
    }, {

    }, function(err) {
        if (err) {
            console.log(err);
        }
        res.send(true);
    });
});

//should be on location route
router.get('/:location', function (req, res, next) {
    House
        .find({
            location: req.params.location,
            hidden: false
        })
        .sort({
            price: +1 //Sort by Date Added DESC
        })
        .exec(function (err, models) {
            if (err) {
                return console.error(err);
            }

            models.forEach(function (model, index) {
                models[index].price_formated = model.price.format(0, 3, ' ', '');
            });

            //res.send(models);
            res.render('house', {
                title: 'Maisons à ' + req.params.location,
                models: models,
                count: models.length
            });
        });
});

module.exports = router;
