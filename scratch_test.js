const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
            });
        }).on('error', reject);
    });
}

async function test() {
    const engines = ['gaama', 'seevn', 'hunjama', 'mtmusic', 'wunk'];
    for (const engine of engines) {
        console.log('Testing engine:', engine);
        const search = await fetchJson(`https://musicapi.x007.workers.dev/search?q=Mercy&searchEngine=${engine}`);
        if (search && search.response && search.response.length > 0) {
            const id = search.response[0].id;
            const fetchRes = await fetchJson(`https://musicapi.x007.workers.dev/fetch?id=${id}`);
            console.log(engine, '->', typeof fetchRes === 'object' ? fetchRes.response : fetchRes);
        } else {
            console.log(engine, '-> No results');
        }
    }
}
test();
