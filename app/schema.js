exports.get = function( which ) {
    var schema;
    switch( which ) {
        case 'stickyguide_region':
            schema = {
                site: String,
                state: String,
                url: String,
                slug: String,
                lastUpdated: Date,
                id: Number
            }
        break;
        case 'stickyguide_subregion':
            schema = {
                site: String,
                state: String,
                url: String,
                slug: String,
                lastUpdated: Date
            }
        break;
        case 'stickyguide_dispensary':
            schema = {
                url: String,
                title: String,
                address: String,
                /*usingMenu: Boolean,*/
                lastUpdated: String
            }
        break;
        case 'stickyguide_hotlist':
            schema = {
                address: String,
                lastUpdated: Date,
                location: String,
                title: String,
                url: String
            }
        break;
        case 'weedmaps_region':
            schema = {
                name: String,
                url: String
            }
        break;
        case 'weedmaps_dispensary_urls':
            schema = {
                name: String,
                url: String
            }
        break;
        case 'price':
            schema = {
                title: String,
                type: String,
                prices: [
                    { 
                        price: Number,
                        unit: String,
                        denotion: String
                    }
                ],
                meta: [
                    {
                        key: String,
                        value: String
                    }
                ],
                createdAt: Date
            }
        break;
    }
    return schema;
};