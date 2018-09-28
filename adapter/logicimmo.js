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

    NAME = 'LogicImmo';


function LogicImmo(location, options) {
    'use strict';
        
    this.location = location;

    this.options = {
        host: 'www.logic-immo.com',
        port: 80,
        path: options && options.path || util.format('/vente-immobilier-%s-%s,%s_2/options/groupprptypesids=2,6,7/pricemax=%s/areamin=%s', location.name, location.codePostal, location.logicImmoId, adapterConfig.pricemax, adapterConfig.areamin)
    };
}

LogicImmo.prototype.proceed = function () {
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

            if ($('body').find('.noresult-search-block').get().length === 0) {
                async.forEachOfSeries($('[itemtype=http\\:\\/\\/schema\\.org\\/ApartmentComplex]'), function (item, key, next) {
                    var $item = $(item),
                        url,
                        href = $item.find('a.offer-link').attr('href');

                    if (href) {
                        url = Url.resolve('http://' + that.options.host, href);
                    } else {
                        href = $item.find('.offer-details-wrapper > a').attr('href');
                    }

                    if (href) {
                        url = Url.resolve('http://' + that.options.host, href).replace(/ /g, '%20');
                    }

                    if (url) {
                        that.extractDescription(url, next);
                    } else {
                        console.warn('[' + NAME + '] - Url is empty:' + that.options.path);
                    }
                });

                if (that.getNextPage($)) {
                    new LogicImmo(that.location, {
                        path: that.getNextPage($)
                    }).proceed();
                }
            }
        });

    }).on('error', function (e) {
        console.log('Got error: ' + e.message);
    });
};

LogicImmo.prototype.getNextPage = function ($document) {
    'use strict';

    var nextPage = $document('.next span');

    if (nextPage) {
        nextPage = nextPage.attr('rel');
        if (nextPage) {
            nextPage = nextPage.replace('hideLink:', '');
            nextPage = new Buffer(nextPage, 'base64').toString('utf8');
        }
    }

    if (nextPage) {
        nextPage = Url.parse(nextPage).path;
    }

    return nextPage;
};

LogicImmo.prototype.getFullUrl = function (path) {
    'use strict';

    return Url.resolve('http://' + this.options.host, path);
};

LogicImmo.prototype.extractDescription = function (url, next) {
    'use strict';

    var that = this,
        options = {
            host: this.options.host,
            port: 80,
            path: url.replace(this.options.host, '').replace('http://', '').replace(/ /g, '%20')
        },

        data;

    House.findOne({url: url}, function (err, doc) {

        if (!doc) {

            http.get(options, function (res) {
                var str = '';

                res.setEncoding('utf8');

                res.setTimeout(2000, function () {
                    console.warn('[' + NAME + '] - Timeout:' + url);
                });

                res.on('data', function (chunk) {
                    str += chunk;
                });

                res.on('end', function () {
                    var $htmlDescription = cheerio.load(str),
                        title = adapterUtil.clean($htmlDescription('.offer-locality').text()),
                        description = adapterUtil.clean($htmlDescription('meta[itemprop=description]').attr('content'));

                    House.findOne({url: url}, function (err, doc) {
                        data = {
                            title: title,
                            url: url,
                            preview: that.getFullUrl($htmlDescription('img#offer_pictures_main').attr('src') || ''),
                            desc: adapterUtil.highlightWords(description),
                            location: that.location.name,
                            price: adapterUtil.cleanPrice($htmlDescription('.offer-price .main-price').text()),
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
module.exports = LogicImmo;
