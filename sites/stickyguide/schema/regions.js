exports.get = function( which ) {
	var schema;
	switch( which ) {
		case 'region':
			schema = {
	            site: String,
	            state: String,
	            url: String,
	            slug: String,
	            lastUpdated: Date,
	            id: Number
			}
		break;
		case 'subregion':
			schema = {
	            site: String,
	            state: String,
	            url: String,
	            slug: String,
	            lastUpdated: Date
			}
		break;
		case 'dispensary':
			schema = {
				url: String,
				title: String,
				address: String,
				location: String,
				lastUpdated: String
			}
		break;
	}
	return schema;
};