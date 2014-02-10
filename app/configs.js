var configuration = function() {};
configuration.prototype = {
	stickyguide: 'https://www.stickyguide.com',
	databaseURL: 'mongodb://localhost/ganjazoid',
	constants: {
		STICKYGUIDE: 1,
		LEAFLY: 	 2,
		WEEDMAPS:    3,
		HARBORSIDE:  4,
		SCRAPETIMEOUT: 120
	},
	batchList: [
		'leafly/scrape-menus',
		'weedmaps/process-dispensary-list',
		'stickyguide/update-hotlist',
		'harborside/items'
	],
	urlList: [
		'weedmaps_dispensary_urls', 
		'leafly_dispensary_urls', 
		'stickyguide_dispensary',
		'harborside_urls'
	],
	set: function( key, value ) {
		this[ key ] = value;
		return self[ key ];
	},
	get: function( key ) {
		return this[ key ];
	}
};

exports.setting = function ( key, value ) {
	var Config = new configuration();
	if( value ) {
		// setting
		return Config.set( key, value );
	} else {
		return Config.get( key );
	}
};	