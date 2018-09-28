/*global require, module*/
var distance = require('jaro-winkler'),
    mongoose = require('mongoose'),
    sanitizeHtml = require('sanitize-html');

var House = mongoose.model('House');

function Util() {
    'use strict';
}

/**
 * Clean a string
 * @param {string} str - the string to clean
 */
Util.clean = function (str) {
    'use strict';

    if (str) {
        str = str.replace(/\n/g, ' ');

        str = str.replace(/ +(?= )/g, '');

        str = str.replace(/\.+(?=\.\.\.)/g, '');

        str = str.replace(/\*\*\*+/g, ''); //remove *****

        str = str.replace(/\-\-\-+/g, ''); //remove -----

        str = sanitizeHtml(str, {
            allowedTags: [ 'br' ]
        });

        str = str.trim();
    }

    return str;

};

/**
 * Clean a string Price
 * @param {string} str - The string to clean
 */
Util.cleanPrice = function (str) {
    'use strict';

    str = Util.clean(str);

    str = str.replace(/FAI/g, '');

    str = str.replace(/\\*/g, '');

    str = str.replace(/€/g, '');

    str = str.replace(/ /g, '');

    str = str.replace('&nbsp;', '');

    str = str.replace('.', '');

    str = str.replace(/[^\d]/g, '');

    return parseInt(str.trim(), 10) || 0;
};

Util.filter = function (data) {
    'use strict';

    var title, description;

    if (data.title && data.desc) {
        title = data.title.toString().toLowerCase();
        description = data.desc.toString().toLowerCase();
    }
    return title && description && title !== '' && title.indexOf('projet de construction') === -1 &&
        title.indexOf('viager') === -1 &&
        title.indexOf('maison campagne') === -1 &&
        title.indexOf('maison de campagne') === -1 &&
        title.indexOf('terrain constructible') === -1 &&
        title.indexOf('réalisez votre maison') === -1 &&
        title.indexOf('de vacance') === -1 &&
        //description
        description !== '' && description.indexOf('projet de construction') === -1 &&
        description.indexOf('viager') === -1 &&
        description.indexOf('maison campagne') === -1 &&
        description.indexOf('maison de campagne') === -1 &&
        description.indexOf('terrain constructible') === -1 &&
        description.indexOf('réalisez votre maison') === -1 &&
        description.indexOf('de vacance') === -1;
};

/**
 * highlightWords a string
 * @param {string} text - The string to highlightWords
 */
Util.highlightWords = function (text) {
    'use strict';

    if (text) {
        text = text.replace(/(\d* chambres)/g, function (match, group1) {
            return '<span class="label label-info">' + group1 + '</span>';
        });

        text = text.replace(/(terrain)/g, function (match, group1) {
            return '<span class="label label-success">' + group1 + '</span>';
        });

        text = text.replace(/(sans vis-a-vis)/g, function (match, group1) {
            return '<span class="label label-success">' + group1 + '</span>';
        });

        text = text.replace(/(sans vis à vis)/g, function (match, group1) {
            return '<span class="label label-success">' + group1 + '</span>';
        });

        text = text.replace(/(copropriété)/g, function (match, group1) {
            return '<span class="label label-warning">' + group1 + '</span>';
        });

        text = text.replace(/(co-propriété)/g, function (match, group1) {
            return '<span class="label label-warning">' + group1 + '</span>';
        });
    }

    return text;
};

Number.prototype.format = function(n, x, s, c) {
    'use strict';

    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
        num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

Util.hasSame = function (data, callback) {

    'use strict';
    var hasSame = false;

    House.find({
        location: data.location,
        price: data.price
    }, function (err, models) {

        if (err) {
            return callback(false);
        }

        hasSame = models.some(function (model) {
            return distance(data.desc.replace(/\W+/g, ''), model.desc.replace(/\W+/g, ''), { caseSensitive: false }) > 0.90;
        });
        return callback(hasSame);

    });
};

// export the class
module.exports = Util;
