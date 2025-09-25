// 全部放在一个文件里：包含 getConfig / getTabs / getCards / getTracks / getPlayinfo / search
const cheerio = createCheerio()

// User-Agent（你可以按需改）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'

let appConfig = {
    ver: 1,
    title: '肉视频',
    site: 'https://rou.video',
}

// ---------- getConfig ----------
async function getConfig() {
    const config = Object.assign({}, appConfig)
    config.tabs = await getTabs()
    return jsonify(config)
}

// ---------- getTabs（混合：优先动态，失败则静态兜底） ----------
async function getTabs() {
    let list = []
    const ignore = ['首頁', '分類', '搜索']
    function isIgnoreClassName(name) {
        if (!name) return false
        return ignore.some((element) => name.includes(element))
    }

    try {
        const { data } = await $fetch.get(`${appConfig.site}/home`, {
            headers: { 'User-Agent': UA },
        })
        const $ = cheerio.load(data)

        // 优先抓所有 /t/ 开头的分类链接（去重）
        const seen = new Set()
        $('a[href^="/t/"]').each((i, e) => {
            const name = $(e).text().trim()
            const href = $(e).attr('href')
            if (!name || !href) return
            if (isIgnoreClassName(name)) return
            // 有些链接是重复的，去重
            if (seen.has(href)) return
            seen.add(href)

            // slug 作为 id（用于拼 page）
            const slug = href.replace(/^\/t\//, '').replace(/\/$/, '')
            list.push({
                name,
                ui: 1,
                ext: {
                    id: slug,
                    url: appConfig.site + href,
                },
            })
        })
    } catch (e) {
        // 记录日志（不会阻塞）
        $print('getTabs 动态抓取失败：', e)
    }

    // 兜底静态分类（当动态抓不到时）
    if (!list || list.length === 0) {
        const fallback = ['糖心Vlog','蜜桃影像傳媒','星空無限傳媒','天美傳媒','香蕉視頻傳媒','精東影業','91製片廠','皇家華人','起點傳媒','大象傳媒','杏吧傳媒','果凍傳媒','蘿莉社','兔子先生','扣扣傳媒','ED Mosaic','SA國際傳媒','愛神傳媒','性視界傳媒','PsychopornTW','拍攝花絮','抖陰','91茄子','絕對領域傳媒','烏托邦傳媒','紅斯燈影像','草莓視頻','樂播傳媒','葫蘆影業','渡邊傳媒','Pussy Hunter','麻麻傳媒','三只狼傳媒','辣椒原創','萝莉原创','MisAV','SWAG@daisybaby','冠希傳媒','微密圈傳媒','西瓜影視','愛妃傳媒','天美影院','肉肉傳媒','烏鴉傳媒','日出文化','鯨魚傳媒','SWAG@cartiernn','國產AV劇情','桃花源','TWAV','Mini傳媒','叮叮映畫','蜜桃視頻','O-STAR','開心鬼傳媒','葵心娛樂','愛污傳媒','愛豆傳媒','MD','MDX','麻豆US','MSD','MCY','MKY','MPG','FLIXKO','貓爪影像','國產麻豆AV節目','麻豆女神微愛視頻','麻豆番外','麻豆三十天特別企劃','麻豆導演系列','情趣K歌房','MDWP','突襲女優家','麻豆女優','麻豆達人秀','MDS','澀會','麻豆女神微愛影片','MDSR','MDL','MAN','MSM','MDHT','MDAG','MS','MSG','MDJ','MDM','MXJ','MDD','MLT','91沈先生','探花精選400','小寶尋花','91lisa','調教小景甜','午夜尋花','91鳳鳴鳥唱','大神精選','AVOVE直播','91貓先生','千人斬探花','全國探花','91Fans','七天探花','9總全國探花','91大神@LovELolita7','18歲母狗無限高潮','鴨哥探花','錘子探花','探花合集','91不見星空','早期東莞ISO桑拿系列','91康先生','肉オナホ','91大神唐伯虎','韋小寶','91風流哥全集','91蜜桃的合集','換妻探花','小陳頭星選','91大神括約肌大叔','情侶自拍','探花精選','91呆哥','mmmn753','楊導撩妹','歌廳探花陳先生','91美女涵菱','太子探花','小馬尋花','91唐哥','jimmybiiig','91天堂原創','小飛探花','王子哥專啪學生妹','文軒探花','偉哥尋歡','大草莓寶貝','探花女下海直播','91天堂系列','91大神胖Kyo','攝影師果哥出品','莞式選妃','catman','90w粉','探花大神','91原創達人@多乙丶','91大黃鴨','小東全國尋妹','91Dr哥','大熊探花','91約妹達人','91大神揚風','91愛絲小仙女思妍','探花郎李尋歡','91新晉大神sweattt','91新人GD超模（現改名69DD）','91大神jinx','91sex哥','175車模','東莞探花','嫖嫖sex探花','秀人網模特','tangbo_hu','HongKongDoll','fansly','BunnyMiffy','Nana_Taipei','ssrpeach','suchanghub','qiobnxingcai','nicolove.cc','kittyxkum','kitty2002102','juneliu','YuZuKitty','Miuzxc','monmon_tw','yui_xin_tw','jeenzen','applecptv','Loliiiiipop99','andmlove','daintywilder','ZZZ666','ChiChibae','blazeconjure3','bdollairi','olive_emmm','aixiaixi','chocoletmilkk','SLRabbit','moremore618','Xreindeers','Carla Grace']
        list = fallback.map((name) => {
            const id = encodeURIComponent(name)
            return {
                name,
                ui: 1,
                ext: { id, url: `${appConfig.site}/t/${id}` },
            }
        })
    }

    return list
}

// ---------- getCards（列表页，支持分页） ----------
async function getCards(ext) {
    ext = argsify(ext)
    let { page = 1, id, url } = ext

    // 规范 url：如果传入的是相对路径，补全；如果没有 url，用 id 拼装
    if (url && url.startsWith('/')) url = appConfig.site + url
    if (!url) {
        if (id) {
            url = `${appConfig.site}/t/${encodeURIComponent(id)}?order=createdAt&page=${page}`
        } else {
            url = `${appConfig.site}/?page=${page}`
        }
    } else {
        // 如果 url 是分类页但没有 page 参数，按规则重写使用 order+page
        const m = url.match(/\/t\/([^\/\?]+)/)
        if (m) {
            const slug = m[1]
            url = `${appConfig.site}/t/${encodeURIComponent(slug)}?order=createdAt&page=${page}`
        } else {
            // 非 /t/ 的 URL：若 page>1 并且未包含 page 参数，则追加
            if (page > 1 && !/(\?|&)page=\d+/.test(url)) {
                url = url + (url.includes('?') ? `&page=${page}` : `?page=${page}`)
            }
        }
    }

    const { data } = await $fetch.get(url, {
        headers: { 'User-Agent': UA, Referer: appConfig.site },
    })
    const $ = cheerio.load(data)
    let cards = []

    // 针对你给的 DOM：视频卡片带 class="group relative"
    $('.group.relative').each((_, element) => {
        const $el = $(element)
        const a = $el.find('a[href^="/v/"]').first()
        if (!a || a.length === 0) return

        let href = a.attr('href') || ''
        if (href && !href.startsWith('http')) href = appConfig.site + href

        // 有两个 img（背景 + 封面），选择最后一个作为封面
        const imgs = $el.find('img')
        let cover = ''
        if (imgs && imgs.length > 0) {
            cover = $(imgs[imgs.length - 1]).attr('src') || $(imgs[0]).attr('src')
        } else {
            cover = $el.find('img').attr('src') || ''
        }

        const title = ($el.find('h3').text() || '').trim() || ($(imgs && imgs.length > 0) ? $(imgs[imgs.length - 1]).attr('alt') : '')
        const remarks = $el.find('.absolute.bottom-1.left-1').text().trim() || $el.find('.text-xs').text().trim() || ''

        cards.push({
            vod_id: href, // 使用详情页完整 URL（或你系统习惯可改为 slug）
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: {
                url: href,
            },
        })
    })

    return jsonify({ list: cards })
}

// ---------- getTracks（返回播放 API / 播放入口） ----------
async function getTracks(ext) {
    ext = argsify(ext)
    let url = ext.url || ext.vod_id || ''
    if (!url) return jsonify({ list: [] })

    // 规范 detail url（若为相对路径）
    if (url.startsWith('/')) url = appConfig.site + url

    // 从 detail url 中提取 slug，例如 /v/cmf0p9juh0000s6xhid0zoh5k
    const m = url.match(/\/v\/([^\/\?\#]+)/)
    const slug = m ? m[1] : null

    // 目前 rou.video 的播放数据通常来自 /api/v/{slug}
    // 我们把这个 API 作为播放入口（getPlayinfo 会去拿真实 m3u8/mp4）
    let playApi = ''
    if (slug) {
        playApi = `${appConfig.site}/api/v/${slug}`
    } else {
        // 如果无法提取 slug，就把 detail 页面当作入口（getPlayinfo 会做容错）
        playApi = url
    }

    const tracks = [
        {
            name: '播放',
            pan: '',
            ext: { url: playApi },
        },
    ]

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

// ---------- getPlayinfo（拿最终播放地址） ----------
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const apiUrl = ext.url
    if (!apiUrl) return jsonify({ urls: [], headers: [] })

    // 请求 API（或 detail 页面），尽量带 Referer
    const { data } = await $fetch.get(apiUrl, {
        headers: { 'User-Agent': UA, Referer: appConfig.site },
    })

    // data 可能是 JSON 对象或字符串
    const json = argsify(data)
    let playurl = ''

    // 常见位置：json.video.videoUrl 或 json.video.playUrl
    if (json && json.video) {
        playurl = json.video.videoUrl || json.video.playUrl || ''
    }

    // 兜底：在返回文本中查找第一条 .m3u8 或 .mp4 链接
    if (!playurl) {
        const raw = (typeof data === 'string') ? data : JSON.stringify(data)
        const m = raw.match(/https?:\/\/[^'"\s]+?\.(m3u8|mp4)(\?[^'"\s]*)?/i)
        if (m) playurl = m[0]
    }

    // 最终返回（如果为空，播放器会报错；不过该逻辑能覆盖大多数情况）
    const headers = [{ 'User-Agent': UA, Referer: appConfig.site }]
    return jsonify({ urls: playurl ? [playurl] : [], headers })
}

// ---------- search ----------
async function search(ext) {
    ext = argsify(ext)
    const keyword = ext.text || ext.keyword || ''
    const page = ext.page || 1
    const q = encodeURIComponent(keyword)
    const url = `${appConfig.site}/search?q=${q}&t=&page=${page}`

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA, Referer: appConfig.site } })
    const $ = cheerio.load(data)
    let cards = []

    $('.group.relative').each((_, element) => {
        const $el = $(element)
        const a = $el.find('a[href^="/v/"]').first()
        if (!a || a.length === 0) return
        let href = a.attr('href')
        if (href && !href.startsWith('http')) href = appConfig.site + href

        const imgs = $el.find('img')
        let cover = ''
        if (imgs && imgs.length > 0) cover = $(imgs[imgs.length - 1]).attr('src') || $(imgs[0]).attr('src')

        const title = ($el.find('h3').text() || '').trim()
        const remarks = $el.find('.absolute.bottom-1.left-1').text().trim() || ''

        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: { url: href },
        })
    })

    return jsonify({ list: cards })
}
