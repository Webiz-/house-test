var mongoose = require('mongoose');

var HouseSchema = mongoose.Schema({
    title: String,
    url: String,
    preview: String,
    desc: String,
    location: String,
    price: Number,
    time: {type: Date, 'default': Date.now},
    adapter: String,
    hidden: {type: Boolean, 'default': false},
    favorite: {type: Boolean, 'default': false}
});


mongoose.model('House', HouseSchema);
