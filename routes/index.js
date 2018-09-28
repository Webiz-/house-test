var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.redirect('/house');
});

//router.get('/test', function (req, res, next) {
//    var Job = require('../adapter/job.js');
//    Job.crawl();
//    res.send('...');
//});

module.exports = router;
