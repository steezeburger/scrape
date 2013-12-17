var _        = require( 'underscore' ),
    Nodeio   = require( 'node.io'),
    Backbone = require( 'backbone');

var Queue = {
    'use strict';
    defaults: {

    },

    initialize: {

    }
};

exports.job  = new Nodeio.Job({
    timeout: 240,   // process life max
    retries: 3,     //
    max: 120        // threads max
},
{
    input: false,
    run: function() {
        Queue = Backbone.Model.extend( Queue );
    }
});