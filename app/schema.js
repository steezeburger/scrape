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
        case 'leafly_dispensary_urls':
            schema = {
                name: String,
                url: String
            }
        break;
        case 'stores':
            schema = {
                title: String,
                addressRaw: String,
                address: {
                    street: String,
                    city: String,
                    state: String,
                    zipcode: String
                },
                urls: [
                    {
                        siteId: Number,
                        slug: String
                    }
                ]
            }
        break;
        case 'items':               // new version of prices
            schema = {
                t:  String,         // title
                n:  String,         // normalized value
                ty: String,         // type
                s:  String,         // source 0=weedmaps,1=leafly,2=stickyguide
                ps: [               // prices
                    { 
                        p: Number,  // price
                        u: String   // unit
                    }
                ],
                cr: Date
            }
        break;
        case 'price':
            schema = {
                title: String,
                type: String,
                source: String,
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
        case 'price.clean':
            schema = {
                title: String,
                type: String,
                source: String,
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
        case 'leafly_strains':
            schema = {  
                name:       String,
                category:   String,
                url:        String
            }
        break;
        case 'seedfinder_strains':
            schema = {  
                name:       String,
                category:   String,
                url:        String
            }
        break;
        case 'scrape_queue':
            schema = {
                isRunning: Boolean,
                Queue: [
                    {
                        batchId:    String,
                        isRunning:  Boolean,
                        startVal:   String,
                        endVal:     String,
                        started:    Date,
                        completed:  Date,
                        exitCode:   String 
                    }
                ]
            }
        break;
    }
    return schema;
};