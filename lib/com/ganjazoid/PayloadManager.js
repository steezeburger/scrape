var PayloadManager = function() {
    var PAYLOAD_LOAD      = 'Load',
    	PAYLOAD_LOADED    = 'Loaded',
    	PAYLOAD_COMPLETE  = 'Complete',
        debug             = false,
		payloads 		  = [];

}

PayloadManager.prototype = {
    init: function( nameOfPayload, debug ) {
        var self = this;
        if( debug ) {
            self.debug = true;
            console.log();
        }
        payloads[ nameOfPayload + this.PAYLOAD_LOAD      ] = 0;
        payloads[ nameOfPayload + this.PAYLOAD_LOADED    ] = 0;
        payloads[ nameOfPayload + this.PAYLOAD_COMPLETE  ] = false;
    },

    get: function( which ) {
        var self = this;
        return payloads[ which + this.PAYLOAD_LOAD ];
    },

    getItemsLoaded: function( which ) {
        var self = this;
        return payloads[ which + this.PAYLOAD_LOADED ];
    },

    set: function( which, value ) {
        var self = this;
        console.log( 'setPayload: ', 'which:', which, 'value: ', value );
        payloads[ which + this.PAYLOAD_LOAD ] = value;
        return;
    },

    itemTick: function( which, value ) {
        var self = this;
        return payloads[ which + this.PAYLOAD_LOADED ] += value;
    },

    tick: function( which, value ) {
        var self = this;
        return payloads[ which + this.PAYLOAD_LOAD ] += value;
    },

    met: function( which ) {
        var self = this, result;

        if ( payloads[ which + this.PAYLOAD_LOAD ] === payloads[ which + this.PAYLOAD_LOADED ] ) {
            console.log( '@ Payload met: ' + which );
            payloads[ which + this.PAYLOAD_COMPLETE ] = true;
            result = true;
        } else {
            result = false;
        }
        return result;
    },
}

exports.payload = function() {
	return new PayloadManager();
}