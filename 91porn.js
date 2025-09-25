const cheerio = createCheerio();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let appConfig = {
    ver: 5,
    title: '91Porn',
    site: 'https://91porn.com/index.php',
    tabs: [
        { name: '原创', id: 'ori' },
        { name: '热门', id: 'hot' },
        { name: '排行榜', id: 'top' },
        { name: '长片', id: 'long' },
        { name: '超长', id: 'longer' },
        { name: 'TF', id: 'tf' },
        { name: 'RF', id: 'rf' },
        { name: 'Top M', id: 'topm' },
        { name: 'MF', id: 'mf' }
    ]
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { page = 1, id } = ext;
    let url = `${appConfig.site}?category=${id}&viewtype=basic`;
    if (page > 1) {
        url += `&page=${page}`;
    }

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    $('.col-xs-12.col-sm-4.col-md-3.col-lg-3').each((_, element) => {
        const href = $(element).find('a').attr('href');
        const title = $(element).find('.video-title').text().trim();
        const cover = $(element).find('img').attr('src');
        const duration = $(element).find('.duration').text().trim();
        const author = $(element).find('.info').eq(1).text().trim();

        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: `${author} | ${duration}`,
            ext: { url: href }
        });
    });

    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });

    // 提取 MP4 播放地址
    const mp4Match = data.match(/<source src="(https?:\/\/[^"]+\.mp4[^"]*)"/);
    if (mp4Match) {
        tracks.push({
            name: '默认',
            pan: '',
            ext: { url: mp4Match[1] }
        });
    }

    return jsonify({
        list: [{ title: '默认分组', tracks }]
    });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    const headers = { 'User-Agent': UA };

    return jsonify({ urls: [url], headers: [headers] });
}
