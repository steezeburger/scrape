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
				lastUpdated: String
			}
		break;
		case 'price':
		schema = {
			strain: String,
			prices: [
				{ 
					unit: String,
					price: Number,
					denotion: String
				}
			],
			meta: {
				source: String,
				ur: String
			},
			createdAt: Date
		}
		break;
	}
	return schema;
};