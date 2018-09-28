/*global require, module*/
var mongoose = require('mongoose'),
    util = require('util'),
    cheerio = require('cheerio'),
    http = require('http'),//require('follow-redirects').http,
    Url = require('url'),
    adapterUtil = require('./util'),
    adapterConfig = require('./configuration'),
    async = require('async');

var House = mongoose.model('House'),

    NAME = 'SeLoger';


function SeLoger(location, options) {
    'use strict';

    this.location = location;

    location = location.codeINSEE.toString();
    location = location.substr(0, 2) + '0' + location.substr(2);

    this.options = {
        host: 'www.seloger.com',
        port: 80,
        path: options && options.path || util.format('/list.htm?ci=%s&org=advanced_search&idtt=2&refannonce=&pxmin=&pxmax=%s&surfacemin=%s&surfacemax=&idtypebien=2&surf_terrainmin=50&surf_terrainmax=&etagemin=&etagemax=&idtypechauffage=&idtypecuisine=', location, adapterConfig.pricemax, adapterConfig.areamin)
    };
}

SeLoger.prototype.getFullUrl = function (path) {
    'use strict';

    return Url.resolve('http://' + this.options.host, path);
};

SeLoger.prototype.proceed = function (finish) {
    'use strict';

    var that = this;

    http.get(this.options, function (res) {
        var str = '';

        res.setEncoding('utf8');

        res.setTimeout(2000, function () {
            console.warn('[' + NAME + '] - Timeout:' + that.options.path);
        });

        res.on('data', function (chunk) {
            str += chunk;
        });

        res.on('end', function () {
            var $ = cheerio.load(str);

            if ($('body').find('.annonce_prox_bloc').get().length === 0) {

                async.forEachOfSeries($('article.listing'), function (item, key, next) {
                    var $item = $(item),
                        url = that.getFullUrl($item.find('h2 a').attr('href'));

                    if(url){
                        that.extractDescription(url, next);
                    } else {
                        console.warn('[' + NAME + '] - Url is empty:' + that.options.path);
                    }
                });

                if (that.getNextPage($)) {
                    new SeLoger(that.location, {
                        path: that.getNextPage($)
                    }).proceed();
                }
            }
        });

    }).on('error', function (e) {
        console.log('Got error: ' + e.message);
    });
};

SeLoger.prototype.getNextPage = function ($document) {
    'use strict';

    var nextPage = $document('a.pagination_next');

    if (nextPage) {
        nextPage = nextPage.attr('href');
    }

    if (nextPage) {
        nextPage = Url.parse(this.getFullUrl(nextPage)).path;
    }

    return nextPage;
};

SeLoger.prototype.extractDescription = function (url, next) {
    'use strict';
console.info(url);
    var that = this,
        options = {
            host: this.options.host,
            port: 80,
            path: url.replace(this.options.host, '').replace('http://', '')
        }, data;

    House.findOne({url: url}, function (err, doc) {

        if (!doc) {
            http.get(options, function (res) {
                var str = '';

                //res.setEncoding('binary');

                res.setTimeout(2000, function () {
                    console.warn('[' + NAME + '] - Timeout:' + url);
                });

                res.on('data', function (chunk) {
                    str += chunk;
                });

                res.on('end', function () {
                    var $htmlDescription = cheerio.load(str),
                        title = adapterUtil.clean($htmlDescription('h1').text()),
                        description = adapterUtil.clean($htmlDescription('.description').html());

                    House.findOne({url: url}, function (err, doc) {
                        data = {
                            title: title,
                            url: url,
                            preview: $htmlDescription('img.carrousel_image_visu').attr('src'),
                            desc: adapterUtil.highlightWords(description),
                            location: that.location.name,
                            price: adapterUtil.cleanPrice($htmlDescription('#price').text()),
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
                            console.log('[' + NAME + '] - not matching filter for URL:' + url + ' - ' + JSON.stringify(data) + str.replace(/\n/g, ''));
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
module.exports = SeLoger;
