/*global require, module*/
var mongoose = require('mongoose'),
    util = require('util'),
    cheerio = require('cheerio'),
    http = require('http'),
    Url = require('url'),
    async = require('async'),
    adapterUtil = require('./util'),
    adapterConfig = require('./configuration');

var House = mongoose.model('House'),

    NAME = 'ParuVendu';

function ParuVendu(location, options) {
    'use strict';

    this.location = location;

    this.options = {
        host: 'www.paruvendu.fr',
        port: 80,
        path: options && options.path || util.format('/immobilier/annonceimmofo/liste/listeAnnonces?tt=1&tbMai=1&at=1&nbp0=&sur0=%s&px1=%s&pa=FR&ddlTri=dateMiseAJour&ddlOrd=desc&ddlFiltres=nofilter&codeINSEE=%s', adapterConfig.areamin, adapterConfig.pricemax, location.codeINSEE)
    };
}

ParuVendu.prototype.proceed = function () {
    'use strict';

    var that = this;

    http.get(this.options, function (res) {
        var str = '';

        res.setEncoding('binary');

        res.setTimeout(2000, function () {
            console.warn('[' + NAME + '] - Timeout:' + that.options.path);
        });

        res.on('data', function (chunk) {
            str += chunk;
        });

        res.on('end', function () {
            var $ = cheerio.load(str);

            if ($('.rech_elargie').get().length === 0) {
                if($('h1').text().indexOf('à') > -1){
                    async.forEachOfSeries($('.annonce'), function (item, key, next) {
                        var $item = $(item),
                            url = Url.resolve('http://' + that.options.host, $item.find('a').attr('href'));

                        if(url){
                            that.extractDescription(url, $item, next);
                        } else {
                            console.warn('[' + NAME + '] - Url is empty:' + that.options.path);
                        }

                    }, function () {
                        if (that.getNextPage($)) {
                            new ParuVendu(that.location, {
                                path: that.getNextPage($)
                            }).proceed();
                        }
                    });
                } else {
                    console.log('ISSUE WITH:', that.options);
                }
            }
        });

    }).on('error', function (e) {
        console.log('Got error: ' + e.message);
    });
};

ParuVendu.prototype.getNextPage = function ($document) {
    'use strict';

    var nextPage = $document('.pagin_ation .flor a');

    if(nextPage){
        nextPage = nextPage.attr('href');
    }

    if (nextPage) {
        nextPage = Url.parse(nextPage).path;
    }

    return nextPage;
};

ParuVendu.prototype.extractDescription = function (url, $item, next) {
    'use strict';

    var that = this,
        options = {
            host: this.options.host,
            port: 80,
            path: url.replace(this.options.host, '').replace('http://', '')
        }, data;

        House.findOne({url: url}, function (err, doc){
            if(!doc) {

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
                            title = adapterUtil.clean($htmlDescription('h1').text()),
                            description = adapterUtil.clean($htmlDescription('.im12_txt_ann').html());

                        House.findOne({url: url}, function (err, doc) {

                            data = {
                                title: title,
                                url: url,
                                preview: $htmlDescription('#pic_main').attr('src'),
                                desc: adapterUtil.highlightWords(description),
                                location: that.location.name,
                                price: adapterUtil.cleanPrice($htmlDescription('#autoprix').text()),
                                adapter: NAME
                            };

                            if (!doc && adapterUtil.filter(data)) {


                                adapterUtil.hasSame(data, function(same) {
                                    if (!same) {
                                        console.log('ADD URL:', url);

                                        new House(data).save(function (err, model) {
                                                next();
                                                if (err) {
                                                    return console.error(err);
                                                }
                                            });
                                    }else {
                                        next();
                                    }
                                });
                            } else {
                                console.log('[' + NAME + '] - not matching filter for URL:' + url);
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
};

// export the class
module.exports = ParuVendu;
