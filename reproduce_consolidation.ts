
const assets = [
    { id: '1', symbol: 'AAPL', name: 'Apple', type: 'abd-hisse', currency: 'USD', platform: 'Midas', quantity: 10, purchasePrice: 100, currentPrice: 150 },
    { id: '2', symbol: 'AAPL', name: 'Apple', type: 'abd-hisse', currency: 'USD', platform: 'Akbank', quantity: 5, purchasePrice: 110, currentPrice: 150 },
    { id: '3', symbol: 'AAPL', name: 'Apple', type: 'abd-hisse', currency: 'USD', platform: null, quantity: 2, purchasePrice: 90, currentPrice: 150 },
    { id: '4', symbol: 'AAPL', name: 'Apple', type: 'abd-hisse', currency: 'USD', platform: undefined, quantity: 1, purchasePrice: 95, currentPrice: 150 },
];

function consolidateAssets(assets: any[]) {
    const consolidated = new Map();

    assets.forEach(asset => {
        // Symbol, type, currency ve platform'a göre key oluştur (symbol case-insensitive)
        const key = `${(asset.symbol || asset.name).toLowerCase()}-${asset.type}-${asset.currency || 'TRY'}-${asset.platform || 'none'}`;

        console.log(`Asset ${asset.id} Key: ${key}`);

        if (consolidated.has(key)) {
            console.log(`-> Merging ${asset.id} into existing key`);
        } else {
            console.log(`-> New Entry for ${asset.id}`);
            consolidated.set(key, asset);
        }
    });

    return Array.from(consolidated.values());
}

const result = consolidateAssets(assets);
console.log(`Total consolidated rows: ${result.length}`);
