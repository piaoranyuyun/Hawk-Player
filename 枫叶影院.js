var rule = {
    title: '枫叶4K',
    host: 'https://www.cd-zj.com',
    UA: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile',
    parseMap: {
        'JD': 'https://fgsrg.hzqingshan.com',
        'co': 'https://zzrs.mfdyvip.com',
        'knmb': 'https://zzrs.mfdyvip.com',
        'YYNB': 'https://zzrs.mfdyvip.com'
    },

    // 初始化（可扩展）
    init: function(cfg) {
        // 可在此处从 cfg 读取自定义 host 等
    },

    // ----- 首页分类 -----
    home: function(filter) {
        try {
            return JSON.stringify({
                class: [
                    { type_id: '4', type_name: '动漫' },
                    { type_id: '2', type_name: '电视剧' },
                    { type_id: '1', type_name: '电影' },
                    { type_id: '/label/qq', type_name: '腾讯' },
                    { type_id: '/label/bli', type_name: 'B站' },
                    { type_id: '/label/youku', type_name: '优酷' },
                    { type_id: '3', type_name: '综艺' },
                    { type_id: '5', type_name: '热门短剧' }
                ]
            });
        } catch (err) {
            return this.backError(err, 'home');
        }
    },

    // ----- 首页推荐（即分类列表的第一页）-----
    homeVod: function() {
        return this.category('', 1, false, {});
    },

    // ----- 分类列表 -----
    category: function(tid, pg, filter, extend) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var page = parseInt(pg) || 1;
                // 处理标签类（如 /label/qq）
                if (!tid || tid.startsWith('/label')) {
                    var url = !tid ? that.host : that.host + tid + '/page/' + page + '.html';
                    console.log('[枫叶4K] label category url:', url);
                    that.req(url, { headers: that.Headers() }).then(function(res) {
                        if (!res || !res.content) throw new Error('获取精选分类失败');
                        that.parseList(res.content).then(function(result) {
                            resolve(result);
                        }).catch(reject);
                    }).catch(reject);
                    return;
                }

                // 普通分类（ajax 接口）
                var params = [
                    'mid=1',
                    'tid=' + tid,
                    'page=' + page,
                    'limit=20'
                ];
                var apiUrl = that.host + '/index.php/ajax/data?' + params.join('&');
                console.log('[枫叶4K] ajax category url:', apiUrl);
                that.myFetch(apiUrl, {}, true).then(function(data) {
                    if (!data) throw new Error('API 请求无响应');
                    var list = [];
                    if (Array.isArray(data.list)) {
                        list = data.list.map(function(it) {
                            var vod_id = it.vod_id ? '/detail/' + it.vod_id + '.html' : '';
                            if (!vod_id && it.detail_link) {
                                var match = it.detail_link.match(/\/detail\/(\d+)\.html/);
                                if (match) vod_id = '/detail/' + match[1] + '.html';
                            }
                            return {
                                vod_id: vod_id,
                                vod_name: (it.vod_name || '').trim(),
                                vod_pic: that.fixPic(it.vod_pic || ''),
                                vod_remarks: (it.vod_remarks || '').trim(),
                                vod_year: (it.vod_year || '').trim()
                            };
                        }).filter(function(it) { return it.vod_id; });
                    }
                    var pagecount = parseInt(data.pagecount) || 1;
                    resolve(JSON.stringify({
                        list: list,
                        page: page,
                        pagecount: pagecount,
                        limit: 20,
                        total: parseInt(data.total) || list.length
                    }));
                }).catch(reject);
            } catch (err) {
                resolve(that.backError(err, 'category'));
            }
        });
    },

    // ----- 搜索 -----
    search: function(wd, quick, pg) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (parseInt(pg) >= 2) {
                resolve(JSON.stringify({ list: [] }));
                return;
            }
            try {
                var cleanWd = decodeURIComponent(wd);
                var searchUrl = that.host + '/index.php/ajax/suggest?mid=1&wd=' + encodeURIComponent(cleanWd) + '&limit=30';
                console.log('[枫叶4K] ajax searchUrl:', searchUrl);
                that.myFetch(searchUrl, {}, true).then(function(data) {
                    if (!data) throw new Error('搜索请求未返回数据');
                    var list = [];
                    if (Array.isArray(data.list)) {
                        list = data.list.map(function(it) {
                            return {
                                vod_id: '/detail/' + it.id + '.html',
                                vod_name: (it.name || '').trim(),
                                vod_pic: that.fixPic(it.pic || ''),
                                vod_remarks: (it.remarks || '').trim()
                            };
                        }).filter(function(it) { return it.vod_id; });
                    }
                    list.reverse(); // 原代码有 reverse
                    resolve(JSON.stringify({ list: list, page: 1 }));
                }).catch(reject);
            } catch (err) {
                resolve(that.backError(err, 'search'));
            }
        });
    },

    // ----- 详情 -----
    detail: function(vid) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var url = that.host + vid;
                that.req(url, { headers: that.Headers() }).then(function(res) {
                    if (!res || !res.content) throw new Error('获取详情页失败');
                    var $ = cheerio.load(res.content);

                    // 解析线路和剧集
                    var lines = [], playlists = [], nameCounts = {};
                    $('.swiper-slide').each(function(_, el) {
                        var rawName = $(el).clone().find('i, span').remove().end().text().trim();
                        if (rawName) {
                            nameCounts[rawName] = (nameCounts[rawName] || 0) + 1;
                            lines.push(nameCounts[rawName] > 1 ? rawName + '-' + nameCounts[rawName] : rawName);
                        }
                    });
                    $('.anthology-list-box').each(function(_, poolEl) {
                        var episodes = [];
                        $(poolEl).find('a').each(function(_, epEl) {
                            var name = $(epEl).text().trim();
                            var href = $(epEl).attr('href') || '';
                            if (name && href) episodes.push(name + '$' + href);
                        });
                        playlists.push(episodes);
                    });
                    // 构建播放数据（原 buildVodPlayData 逻辑内联）
                    var processedPlaylists = playlists.map(function(eps) { return eps.reverse().join('#'); });
                    var vod_play_from = lines.filter(Boolean).join('$$$');
                    var vod_play_url = processedPlaylists.join('$$$');

                    // 提取基本信息
                    var vod_name = $('.slide-info-title').text().trim();
                    var imgAttr = $('.detail-pic img').attr('data-src') || $('.detail-pic img').attr('src') || '';
                    var vod_pic = that.fixPic(imgAttr);
                    var getInfoText = function(key) {
                        var $box = $('.detail-info .slide-info:contains("' + key + '")').clone();
                        $box.find('strong').remove();
                        return $box.text().replace(/\s+/g, ' ').trim();
                    };
                    var vod_director = getInfoText('导演');
                    var vod_actor = getInfoText('主演');
                    var vod_remarks = getInfoText('连载') || getInfoText('更新');
                    var vod_content = $('#height_limit').text().trim() || $('.detail-info .slide-info-p').text().trim();

                    var vod = {
                        vod_id: vid,
                        vod_name: vod_name,
                        vod_pic: vod_pic,
                        vod_director: vod_director,
                        vod_actor: vod_actor,
                        vod_remarks: vod_remarks,
                        vod_content: vod_content,
                        vod_play_from: vod_play_from,
                        vod_play_url: vod_play_url
                    };
                    resolve(JSON.stringify({ list: [vod] }));
                }).catch(reject);
            } catch (err) {
                resolve(that.backError(err, 'detail'));
            }
        });
    },

    // ----- 播放 -----
    play: function(flag, id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var detailUrl = that.host + id;
                console.log('[枫叶4K] detailUrl:', detailUrl);
                that.req(detailUrl, { headers: that.Headers() }).then(function(res) {
                    if (!res || !res.content) throw new Error('详情页网络请求失败');
                    var match = res.content.match(/var\s+player_aaaa[\s\S]*?"url"\s*:\s*"([^"]+)"/);
                    var url = match ? match[1].replace(/\\/g, '') : '';
                    if (!url) throw new Error('页面中未匹配到视频 URL 变量');

                    if (url.startsWith('http') && (url.includes('m3u') || url.includes('.mp4'))) {
                        console.log('[枫叶4K] 直链播放', url);
                        resolve(JSON.stringify({ parse: 0, url: url }));
                        return;
                    }

                    that.parsePLayUrl(url).then(function(playUrl) {
                        if (!playUrl) throw new Error('线路解析失败，请尝试切换播放线路');
                        resolve(JSON.stringify({ parse: 0, url: playUrl }));
                    }).catch(reject);
                }).catch(reject);
            } catch (err) {
                resolve(that.backError(err, 'play'));
            }
        });
    },

    // ========================================
    // 内部辅助方法
    // ========================================

    // 统一错误响应
    backError: function(err, type) {
        var msg = err?.message || err || '枫叶4K未知异常';
        console.log('[枫叶4K] 错误捕获 ->', msg);
        if (type === 'play') return JSON.stringify({ parse: 0, msg: msg });
        if (type === 'home') return JSON.stringify({ msg: msg, class: [] });
        return JSON.stringify({ msg: msg, list: [], pagecount: 1 });
    },

    // JSON 解析
    myjsonParse: function(target) {
        return typeof target === 'string' ? JSON.parse(target) : (target || {});
    },

    // 请求头
    Headers: function() {
        return {
            'user-agent': this.UA,
            'Referer': this.host + '/',
            'Cookie': ''
        };
    },

    // 封装请求（支持 req 全局）
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
    },

    // 带 JSON 解析的 fetch
    myFetch: function(url, options, needJsonParse) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.req(url, options).then(function(res) {
                if (needJsonParse !== false) {
                    resolve(that.myjsonParse(res?.content));
                } else {
                    resolve(res?.content);
                }
            }).catch(reject);
        });
    },

    // 图片地址修补
    fixPic: function(u) {
        if (!u) return '';
        if (u.startsWith('//')) return 'https:' + u;
        return u.replace(/&amp;/g, '&');
    },

    // 解析 HTML 列表（用于标签分类）
    parseList: function(html) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var $ = cheerio.load(html);
                var list = [];
                $('.public-list-bj').each(function(_, el) {
                    var $el = $(el);
                    var vod_id = $el.find('a.public-list-exp').attr('href');
                    var vod_name = $el.find('a.public-list-exp').attr('title') || $('.thumb-content a').text().trim();
                    var vod_pic = that.fixPic($el.find('.public-list-exp img').attr('data-src') || '');
                    var vod_remarks = $el.find('.ft2').text().trim();
                    var text4k = $el.find('.public-list-exp .public-prt-g').text().trim();
                    var updateTime = $el.find('.public-list-exp .public-prt').eq(1).text().trim();
                    var vod_year = (text4k ? '「' + text4k + '」' : '') + ' ' + updateTime;
                    list.push({ vod_id: vod_id, vod_name: vod_name?.trim(), vod_pic: vod_pic, vod_remarks: vod_remarks, vod_year: vod_year.trim() });
                });
                var pagecount = parseInt($('.page-tip').text().match(/\d+\/(\d+)页/)?.[1]) || 1;
                resolve(JSON.stringify({ list: list, pagecount: pagecount }));
            } catch (err) {
                reject(err);
            }
        });
    },

    // 播放地址解析（原 parsePLayUrl）
    parsePLayUrl: function(url) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var lineKey = url.split(/[-_]/)[0];
                var parseApiUrl = that.parseMap[lineKey] || that.parseMap['JD'];
                if (!parseApiUrl) throw new Error('未找到匹配的解析接口[' + lineKey + ']');
                var htmlResPromise = that.req(parseApiUrl + '/player/?url=' + url, { headers: that.Headers() });
                htmlResPromise.then(function(htmlRes) {
                    if (!htmlRes || !htmlRes.content) throw new Error('获取解析播放器页面失败');
                    var $ = cheerio.load(htmlRes.content);
                    var token = $('#player-data').attr('data-te');
                    if (!token) throw new Error('未寻找到 token 数据');
                    var playDataResPromise = that.req(parseApiUrl + '/player/mplayer.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                        data: 'url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(token)
                    });
                    playDataResPromise.then(function(playDataRes) {
                        if (!playDataRes || !playDataRes.content) throw new Error('二次解析接口请求失败');
                        var parsed = JSON.parse(playDataRes.content);
                        var playUrl = parsed.url;
                        if (!playUrl) throw new Error('二次解析未获取到 URL');
                        if (playUrl.startsWith('/playproxy.php')) {
                            playUrl = parseApiUrl + playUrl;
                        }
                        resolve(playUrl);
                    }).catch(reject);
                }).catch(reject);
            } catch (err) {
                console.log('[枫叶4K] parsePLayUrl 内部错误:', err.message);
                reject(err);
            }
        });
    }
};

// 导出规则（兼容 TVBox 的 __jsEvalReturn 方式）
export function __jsEvalReturn() {
    return rule;
}
