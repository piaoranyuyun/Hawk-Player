var rule = {
    title: '肉视频',
    host: 'https://rou.video',
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',

    // ----- 初始化 -----
    init: function(cfg) {
        // 可扩展：从 cfg 读取自定义 host
    },

    // ----- 首页分类（动态抓取 + 静态兜底）-----
    home: function(filter) {
        var that = this;
        return new Promise(function(resolve) {
            that._getTabs().then(function(tabs) {
                var classes = tabs.map(function(tab) {
                    return { type_id: tab.ext.id, type_name: tab.name };
                });
                resolve(JSON.stringify({ class: classes }));
            }).catch(function() {
                // 兜底：使用静态分类列表
                var fallbackClasses = that._getFallbackTabs().map(function(name) {
                    return { type_id: encodeURIComponent(name), type_name: name };
                });
                resolve(JSON.stringify({ class: fallbackClasses }));
            });
        });
    },

    // ----- 首页推荐（返回首页第一页）-----
    homeVod: function() {
        return this.category('', 1);
    },

    // ----- 分类列表（支持分页）-----
    category: function(tid, pg, filter, extend) {
        var that = this;
        pg = pg || 1;
        return new Promise(function(resolve) {
            var url;
            if (tid) {
                // 有分类 id，构造分类 URL
                url = that.host + '/t/' + encodeURIComponent(tid) + '?order=createdAt&page=' + pg;
            } else {
                // 首页
                url = that.host + '/?page=' + pg;
            }
            that.req(url, { headers: { 'User-Agent': that.UA, 'Referer': that.host } }).then(function(res) {
                var html = res.content || '';
                var list = that._parseCards(html);
                // 粗略分页（原代码未提供总页数）
                var pagecount = parseInt(pg) + 1;
                resolve(JSON.stringify({ list: list, pagecount: pagecount, page: parseInt(pg) }));
            }).catch(function(err) {
                resolve(JSON.stringify({ list: [], pagecount: 1, page: 1, msg: err.message }));
            });
        });
    },

    // ----- 搜索 -----
    search: function(wd, quick, pg) {
        var that = this;
        pg = pg || 1;
        return new Promise(function(resolve) {
            var url = that.host + '/search?q=' + encodeURIComponent(wd) + '&t=&page=' + pg;
            that.req(url, { headers: { 'User-Agent': that.UA, 'Referer': that.host } }).then(function(res) {
                var html = res.content || '';
                var list = that._parseCards(html);
                resolve(JSON.stringify({ list: list, pagecount: 1, page: parseInt(pg) }));
            }).catch(function(err) {
                resolve(JSON.stringify({ list: [], msg: err.message }));
            });
        });
    },

    // ----- 详情（获取播放入口）-----
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve) {
            var url = id.startsWith('http') ? id : that.host + id;
            // 从 URL 中提取 slug
            var slugMatch = url.match(/\/v\/([^\/\?\#]+)/);
            var slug = slugMatch ? slugMatch[1] : null;
            var playApi = slug ? that.host + '/api/v/' + slug : url;

            var vod = {
                vod_id: id,
                vod_name: '视频详情',
                vod_pic: '',
                vod_remarks: '',
                vod_play_from: '默认',
                vod_play_url: '播放$' + playApi  // 将 API 地址作为播放入口
            };
            resolve(JSON.stringify({ list: [vod] }));
        });
    },

    // ----- 播放（获取最终播放地址）-----
    play: function(flag, id, flags) {
        var that = this;
        return new Promise(function(resolve) {
            // id 可能是 playApi 地址（来自 detail 的 vod_play_url）
            var apiUrl = id;
            that.req(apiUrl, { headers: { 'User-Agent': that.UA, 'Referer': that.host } }).then(function(res) {
                var data = res.content || '';
                var playurl = '';
                // 尝试解析 JSON
                try {
                    var json = typeof data === 'string' ? JSON.parse(data) : data;
                    if (json && json.video) {
                        playurl = json.video.videoUrl || json.video.playUrl || '';
                    }
                } catch (e) {
                    // 非 JSON，尝试正则匹配
                }
                // 兜底：正则匹配 m3u8/mp4
                if (!playurl) {
                    var raw = typeof data === 'string' ? data : JSON.stringify(data);
                    var m = raw.match(/https?:\/\/[^'"\s]+?\.(m3u8|mp4)(\?[^'"\s]*)?/i);
                    if (m) playurl = m[0];
                }
                resolve(JSON.stringify({ parse: 0, url: playurl || '' }));
            }).catch(function(err) {
                resolve(JSON.stringify({ parse: 0, url: '', msg: err.message }));
            });
        });
    },

    // ========================================
    // 内部辅助方法
    // ========================================

    // 动态抓取分类
    _getTabs: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            var ignore = ['首頁', '分類', '搜索'];
            function isIgnoreClassName(name) {
                if (!name) return false;
                return ignore.some(function(item) { return name.includes(item); });
            }
            that.req(that.host + '/home', { headers: { 'User-Agent': that.UA } }).then(function(res) {
                var html = res.content || '';
                var $ = cheerio.load(html);
                var list = [];
                var seen = {};
                $('a[href^="/t/"]').each(function(_, el) {
                    var name = $(el).text().trim();
                    var href = $(el).attr('href');
                    if (!name || !href) return;
                    if (isIgnoreClassName(name)) return;
                    if (seen[href]) return;
                    seen[href] = true;
                    var slug = href.replace(/^\/t\//, '').replace(/\/$/, '');
                    list.push({
                        name: name,
                        ui: 1,
                        ext: { id: slug, url: that.host + href }
                    });
                });
                if (list.length === 0) {
                    reject(new Error('未抓取到分类'));
                } else {
                    resolve(list);
                }
            }).catch(function(err) {
                reject(err);
            });
        });
    },

    // 静态兜底分类列表
    _getFallbackTabs: function() {
        return [
            '糖心Vlog', '蜜桃影像傳媒', '星空無限傳媒', '天美傳媒', '香蕉視頻傳媒',
            '精東影業', '91製片廠', '皇家華人', '起點傳媒', '大象傳媒', '杏吧傳媒',
            '果凍傳媒', '蘿莉社', '兔子先生', '扣扣傳媒', 'ED Mosaic', 'SA國際傳媒',
            '愛神傳媒', '性視界傳媒', 'PsychopornTW', '拍攝花絮', '抖陰', '91茄子',
            '絕對領域傳媒', '烏托邦傳媒', '紅斯燈影像', '草莓視頻', '樂播傳媒',
            '葫蘆影業', '渡邊傳媒', 'Pussy Hunter', '麻麻傳媒', '三只狼傳媒',
            '辣椒原創', '萝莉原创', 'MisAV', 'SWAG@daisybaby', '冠希傳媒',
            '微密圈傳媒', '西瓜影視', '愛妃傳媒', '天美影院', '肉肉傳媒',
            '烏鴉傳媒', '日出文化', '鯨魚傳媒', 'SWAG@cartiernn', '國產AV劇情',
            '桃花源', 'TWAV', 'Mini傳媒', '叮叮映畫', '蜜桃視頻', 'O-STAR',
            '開心鬼傳媒', '葵心娛樂', '愛污傳媒', '愛豆傳媒', 'MD', 'MDX',
            '麻豆US', 'MSD', 'MCY', 'MKY', 'MPG', 'FLIXKO', '貓爪影像',
            '國產麻豆AV節目', '麻豆女神微愛視頻', '麻豆番外', '麻豆三十天特別企劃',
            '麻豆導演系列', '情趣K歌房', 'MDWP', '突襲女優家', '麻豆女優',
            '麻豆達人秀', 'MDS', '澀會', '麻豆女神微愛影片', 'MDSR', 'MDL',
            'MAN', 'MSM', 'MDHT', 'MDAG', 'MS', 'MSG', 'MDJ', 'MDM', 'MXJ',
            'MDD', 'MLT', '91沈先生', '探花精選400', '小寶尋花', '91lisa',
            '調教小景甜', '午夜尋花', '91鳳鳴鳥唱', '大神精選', 'AVOVE直播',
            '91貓先生', '千人斬探花', '全國探花', '91Fans', '七天探花',
            '9總全國探花', '91大神@LovELolita7', '18歲母狗無限高潮', '鴨哥探花',
            '錘子探花', '探花合集', '91不見星空', '早期東莞ISO桑拿系列',
            '91康先生', '肉オナホ', '91大神唐伯虎', '韋小寶', '91風流哥全集',
            '91蜜桃的合集', '換妻探花', '小陳頭星選', '91大神括約肌大叔',
            '情侶自拍', '探花精選', '91呆哥', 'mmmn753', '楊導撩妹',
            '歌廳探花陳先生', '91美女涵菱', '太子探花', '小馬尋花', '91唐哥',
            'jimmybiiig', '91天堂原創', '小飛探花', '王子哥專啪學生妹',
            '文軒探花', '偉哥尋歡', '大草莓寶貝', '探花女下海直播',
            '91天堂系列', '91大神胖Kyo', '攝影師果哥出品', '莞式選妃',
            'catman', '90w粉', '探花大神', '91原創達人@多乙丶', '91大黃鴨',
            '小東全國尋妹', '91Dr哥', '大熊探花', '91約妹達人', '91大神揚風',
            '91愛絲小仙女思妍', '探花郎李尋歡', '91新晉大神sweattt',
            '91新人GD超模（現改名69DD）', '91大神jinx', '91sex哥', '175車模',
            '東莞探花', '嫖嫖sex探花', '秀人網模特', 'tangbo_hu', 'HongKongDoll',
            'fansly', 'BunnyMiffy', 'Nana_Taipei', 'ssrpeach', 'suchanghub',
            'qiobnxingcai', 'nicolove.cc', 'kittyxkum', 'kitty2002102',
            'juneliu', 'YuZuKitty', 'Miuzxc', 'monmon_tw', 'yui_xin_tw',
            'jeenzen', 'applecptv', 'Loliiiiipop99', 'andmlove', 'daintywilder',
            'ZZZ666', 'ChiChibae', 'blazeconjure3', 'bdollairi', 'olive_emmm',
            'aixiaixi', 'chocoletmilkk', 'SLRabbit', 'moremore618',
            'Xreindeers', 'Carla Grace'
        ];
    },

    // 解析卡片列表
    _parseCards: function(html) {
        var that = this;
        var $ = cheerio.load(html);
        var list = [];
        $('.group.relative').each(function(_, element) {
            var $el = $(element);
            var a = $el.find('a[href^="/v/"]').first();
            if (!a || a.length === 0) return;
            var href = a.attr('href') || '';
            if (href && !href.startsWith('http')) href = that.host + href;
            var imgs = $el.find('img');
            var cover = '';
            if (imgs && imgs.length > 0) {
                cover = $(imgs[imgs.length - 1]).attr('src') || $(imgs[0]).attr('src') || '';
            }
            var title = ($el.find('h3').text() || '').trim();
            if (!title && imgs.length > 0) {
                title = $(imgs[imgs.length - 1]).attr('alt') || '';
            }
            var remarks = $el.find('.absolute.bottom-1.left-1').text().trim() || $el.find('.text-xs').text().trim() || '';
            if (href) {
                list.push({
                    vod_id: href,
                    vod_name: title || '无标题',
                    vod_pic: cover,
                    vod_remarks: remarks,
                    ext: { url: href }
                });
            }
        });
        return list;
    },

    // 封装请求
    req: function(url, options) {
        return new Promise(function(resolve, reject) {
            options = options || {};
            options.method = options.method || 'get';
            if (typeof req === 'function') {
                req(url, options, function(err, resp) {
                    if (err) reject(err);
                    else resolve(resp);
                });
            } else {
                fetch(url, options).then(function(res) { return res.text(); }).then(function(text) { resolve({ content: text }); }).catch(reject);
            }
        });
    }
};

// 导出规则
export function __jsEvalReturn() {
    return rule;
}
