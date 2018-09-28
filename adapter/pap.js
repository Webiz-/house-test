/*global require, module*/
var mongoose = require('mongoose'),
    util = require('util'),
    cheerio = require('cheerio'),
    http = require('follow-redirects').http,
    Url = require('url'),
    adapterUtil = require('./util'),
    adapterConfig = require('./configuration'),
    async = require('async');

var House = mongoose.model('House'),

    NAME = 'PAP';

function Pap(location) {
    'use strict';

    this.location = location;

    this.options = {
        timeout: 5000,
        host: 'www.pap.fr',
        port: 80,
        path: util.format('/annonce/vente-maisons-g%s-jusqu-a-%s-euros-a-partir-de-%s-m2-40-annonces-par-page', location.papId, adapterConfig.pricemax, adapterConfig.areamin)
    };
}

Pap.prototype.proceed = function () {
    'use strict';

    var that = this;

    http.get(this.options, function (res) {
        var str = '';

        res.setEncoding('utf8');

        //res.setTimeout(2000, function () {
        //    console.warn('[' + NAME + '] - Timeout:' + that.options.path);
        //});

        res.on('data', function (chunk) {
            str += chunk;
        });

        res.on('end', function () {
            var $ = cheerio.load(str);

            if ($('body').find('.no-results').get().length === 0) {

                async.forEachOfSeries($('li.annonce'), function (item, key, next) {
                    var $item = $(item),
                        url = Url.resolve('http://' + that.options.host, $item.find('.header-annonce a').attr('href'));

                    if(url){
                        that.extractDescription(url, next);
                    } else {
                        console.warn('[' + NAME + '] - Url is empty:' + that.options.path);
                    }
                });
            }
        });

    }).on('error', function (e) {
        console.error('[' + NAME + '] - Error:' + e.message + ' - ' + that.options.path);
    });
};

Pap.prototype.extractDescription = function (url, next) {
    'use strict';

    var that = this,
        options = {
            host: this.options.host,
            port: 80,
            path: url.replace(this.options.host, '').replace('http://', '')
        }, data;

    if (url.indexOf('construiresamaison') === -1) {
        House.findOne({url: url}, function (err, doc) {

            if (!doc) {
                http.get(options, function (res) {
                    var str = '';

                    res.setEncoding('binary');

                    res.setTimeout(2000, function () {
                        console.warn('[' + NAME + '] - Timeout:' + url);
                    });

                    res.on('data', function (chunk) {
                        str += chunk;
                    });

                    res.on('end', function () {
                        var $htmlDescription = cheerio.load(str.toString('utf8')),
                            title = adapterUtil.clean($htmlDescription('.header-descriptif .title').text()),
                            description = adapterUtil.clean($htmlDescription('.text-annonce-container p').html());

                        House.findOne({url: url}, function (err, doc) {

                            data = {
                                title: title,
                                url: url,
                                preview: $htmlDescription('.showcase-content img').attr('src'),
                                desc: adapterUtil.highlightWords(description),
                                location: that.location.name,
                                price: adapterUtil.cleanPrice($htmlDescription('.desc .prix').text()),
                                adapter: NAME
                            };

                            if (!doc && adapterUtil.filter(data)) {

                                adapterUtil.hasSame(data, function (same) {
                                    if (!same) {
                                        console.log('ADD URL:', url);

                                        new House(data).save(function (err, model) {
                                                next();
                                                if (err) {
                                                    return console.error(err);
                                                }
                                            });
                                    } else {
                                        next();
                                    }
                                });
                            } else {
                                console.log('[' + NAME + '] - not matching filter for URL:' + url + JSON.stringify(data));
                                next();
                            }
                        });
                    });

                }).on('error', function (e) {
                    next();
                    console.log('Got error: ' + e.message);
                    console.log('Options:', that.options);
                    //res.send('error');
                });
            } else {
                doc.time = Date.now();
                doc.save(function (err) {
                    next();
                    if(err) {
                        console.error('ERROR!');
                    }
                });
            }

        });
    } else {
        next();
    }
};

// export the class
module.exports = Pap;
