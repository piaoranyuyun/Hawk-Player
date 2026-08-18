var rule = {
    title: '西瓜影视',
    host: 'https://www.xiguazx.cc',
    sites: ['https://www.xiguazx.cc', 'https://www.bzzdyy.com'],
    parseApi: 'https://hls.xiguadh.com', // 也可切换 'https://svip.qlplayer.cyou'
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // ----- 初始化（可在此切换站点）-----
    init: function(cfg) {
        // 如果配置传入 host，则覆盖
        if (cfg && cfg.host) {
            this.host = cfg.host;
        }
    },

    // ----- 首页分类 + 筛选器 -----
    home: function(filter) {
        try {
            return JSON.stringify({
                class: [
                    { type_id: '43', type_name: '动漫' },
                    { type_id: '37', type_name: '剧集' },
                    { type_id: '47', type_name: 'B站' },
                    { type_id: '20', type_name: '电影' },
                    { type_id: '45', type_name: '综艺' }
                ],
                filters: filter ? this.myFilters : {}
            });
        } catch (e) {
            return this.errRes(e.message, { class: [] });
        }
    },

    // ----- 首页推荐 -----
    homeVod: function() {
        var that = this;
        return new Promise(function(resolve) {
            that.req(that.host, { headers: that.Headers() }).then(function(res) {
                resolve(JSON.stringify({ list: that._getVodList(res.content) }));
            }).catch(function(e) {
                resolve(that.errRes(e.message));
            });
        });
    },

    // ----- 分类列表（带分页和筛选）-----
    category: function(tid, pg, filter, extend) {
        var that = this;
        extend = extend || {};
        var page = pg || '1';
        var orderby = extend.orderby || 'hits';
        var realTid = extend.tid || tid || '20';
        var url = that.host + '/index.php/vod/show/by/' + orderby + '/id/' + realTid + '/page/' + page + '.html';
        return new Promise(function(resolve) {
            that.req(url, { headers: that.Headers() }).then(function(res) {
                var html = res.content;
                var pageMatch = html.match(/href=".*page\/(\d+)\.html".*尾页/);
                var pagecount = pageMatch ? parseInt(pageMatch[1]) : parseInt(page) + 1;
                resolve(JSON.stringify({
                    list: that._getVodList(html),
                    pagecount: pagecount
                }));
            }).catch(function(e) {
                resolve(that.errRes(e.message));
            });
        });
    },

    // ----- 搜索 -----
    search: function(key) {
        var that = this;
        return new Promise(function(resolve) {
            var url = that.host + '/index.php/vod/search.html';
            var options = {
                method: 'POST',
                headers: that.Headers(),
                data: { wd: encodeURIComponent(key) }
            };
            that.req(url, options).then(function(res) {
                resolve(JSON.stringify({ list: that._getVodList(res.content), pagecount: 1 }));
            }).catch(function(e) {
                resolve(that.errRes(e.message));
            });
        });
    },

    // ----- 详情 -----
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve) {
            var url = that.host + '/index.php/vod/detail/id/' + id + '.html';
            that.req(url, { headers: that.Headers() }).then(function(res) {
                var html = res.content || '';
                var playData = that._parsePlayData(html);
                var info = that._parseVodInfo(html);
                var vod = {
                    vod_id: id,
                    vod_name: info.vod_name,
                    vod_pic: info.vod_pic,
                    vod_type_name: info.vod_type_name,
                    vod_year: info.vod_year,
                    vod_area: info.vod_area,
                    vod_remarks: info.vod_remarks,
                    vod_director: info.vod_director,
                    vod_actor: info.vod_actor,
                    vod_content: info.vod_content,
                    vod_play_from: playData.playFromList.join('$$$'),
                    vod_play_url: playData.playUrlList.map(function(e) { return e.join('#'); }).join('$$$')
                };
                resolve(JSON.stringify({ list: [vod] }));
            }).catch(function(e) {
                resolve(that.errRes(e.message));
            });
        });
    },

    // ----- 播放 -----
    play: function(flag, id) {
        var that = this;
        return new Promise(function(resolve) {
            var playUrl = that.buildUrl(id);
            that.req(playUrl, { headers: that.Headers() }).then(function(res) {
                var html = res.content || '';
                var match = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})/);
                if (match) {
                    var playerData = JSON.parse(match[1]);
                    var targetUrl = that.formatUrl(playerData.url);
                    if (targetUrl.startsWith('http') && (targetUrl.includes('.mp4') || targetUrl.includes('.m3u8'))) {
                        resolve(JSON.stringify({ parse: 0, url: targetUrl, header: that.Headers() }));
                        return;
                    }
                    var parseUrl = that.parseApi + '?url=' + encodeURIComponent(targetUrl);
                    that.req(parseUrl, { headers: that.Headers() }).then(function(res2) {
                        var html2 = res2.content || '';
                        var tokenMatch = html2.match(/apiToken\s*:\s*["']([^"']+)["']/);
                        if (tokenMatch) {
                            var token = tokenMatch[1];
                            var tokenUrl = that.parseApi + '/api/resolve.php?token=' + encodeURIComponent(token);
                            that.req(tokenUrl, { headers: that.Headers() }).then(function(res3) {
                                try {
                                    var data = JSON.parse(res3.content);
                                    if (data.code === 404) {
                                        resolve(JSON.stringify({ msg: '无法解析视频，请尝试换一个播放源解析！' }));
                                    } else {
                                        resolve(JSON.stringify({ parse: 0, url: that.formatUrl(data.url), header: that.Headers() }));
                                    }
                                } catch (e) {
                                    resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
                                }
                            }).catch(function() {
                                resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
                            });
                        } else {
                            resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
                        }
                    }).catch(function() {
                        resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
                    });
                } else {
                    resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
                }
            }).catch(function() {
                resolve(JSON.stringify({ parse: 0, url: '', header: that.Headers() }));
            });
        });
    },

    // ========================================
    // 内部辅助方法
    // ========================================

    Headers: function() {
        return { 'User-Agent': this.UA };
    },

    buildUrl: function(p) {
        if (!p) return '';
        if (p.startsWith('http')) return p;
        return this.host + (p.startsWith('/') ? '' : '/') + p;
    },

    formatUrl: function(u) {
        if (!u) return '';
        return u.replace(/\\/g, '').replace(/^(https?:\/)((?!\/))/i, '$1/');
    },

    errRes: function(msg, extra) {
        extra = extra || {};
        return JSON.stringify({ list: [], msg: msg, ...extra });
    },

    // 筛选器配置
    myFilters: (function() {
        var orderFilter = {
            key: 'orderby',
            name: '排序',
            value: [
                { n: '默认排序', v: '' },
                { n: '人气', v: 'hits' },
                { n: '时间', v: 'time' },
                { n: '评分', v: 'score' }
            ]
        };
        return {
            '20': [
                {
                    key: 'tid',
                    name: '分类',
                    value: [
                        { n: '全部', v: '20' },
                        { n: '动作片', v: '21' },
                        { n: '喜剧片', v: '22' },
                        { n: '爱情片', v: '23' },
                        { n: '科幻片', v: '24' },
                        { n: '恐怖片', v: '25' },
                        { n: '剧情片', v: '26' },
                        { n: '战争片', v: '27' },
                        { n: '惊悚片', v: '28' },
                        { n: '犯罪片', v: '29' },
                        { n: '冒险篇', v: '30' },
                        { n: '动画片', v: '31' },
                        { n: '悬疑片', v: '32' },
                        { n: '武侠片', v: '33' },
                        { n: '奇幻片', v: '34' },
                        { n: '纪录片', v: '35' },
                        { n: '其他片', v: '36' }
                    ]
                },
                orderFilter
            ],
            '37': [
                {
                    key: 'tid',
                    name: '分类',
                    value: [
                        { n: '全部', v: '37' },
                        { n: '国产剧', v: '38' },
                        { n: '港台剧', v: '39' },
                        { n: '欧美剧', v: '40' },
                        { n: '日韩剧', v: '41' }
                    ]
                },
                orderFilter
            ],
            '43': [orderFilter],
            '45': [orderFilter],
            '47': [
                {
                    key: 'tid',
                    name: '分类',
                    value: [
                        { n: '全部', v: '47' },
                        { n: '番剧', v: '48' },
                        { n: '国创', v: '49' },
                        { n: '电影', v: '50' },
                        { n: '电视剧', v: '51' }
                    ]
                },
                orderFilter
            ]
        };
    })(),

    // 解析视频列表（首页/分类/搜索）
    _getVodList: function(html) {
        if (!html) return [];
        var list = [];
        var reg = /<a class="stui-vodlist__thumb[^"]*" href="[^"]*\/id\/(\d+)\.html" title="([^"]+)" data-original="([^"]+)"[\s\S]*?<span class="pic-text text-right"><b>([^<]+)<\/b><\/span>/g;
        var m;
        while ((m = reg.exec(html)) !== null) {
            list.push({
                vod_id: m[1],
                vod_name: m[2],
                vod_pic: this.buildUrl(m[3]),
                vod_remarks: m[4].trim()
            });
        }
        return list;
    },

    // 解析播放线路和剧集
    _parsePlayData: function(html) {
        var playFromList = [];
        var playUrlList = [];
        // 提取线路名称
        var fromMatches = html.matchAll(/<a href="#playlist\d+"[^>]*>([\s\S]*?)<\/a>/g);
        for (var m of fromMatches) {
            playFromList.push(m[1].trim());
        }
        // 提取剧集
        var tabContentMatch = /<div class="tab-content[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/.exec(html) ||
            /<div class="tab-content[\s\S]*?<\/div>\s*<\/div>/.exec(html);
        var targetHtml = tabContentMatch ? tabContentMatch[1] : html;
        var sections = targetHtml.split('id="playlist');
        for (var i = 1; i < sections.length; i++) {
            var section = sections[i];
            var episodes = [];
            var epMatches = section.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g);
            for (var ep of epMatches) {
                var href = ep[1].trim();
                if (href && !href.startsWith('mailto:')) {
                    episodes.push(ep[2].trim() + '$' + href);
                }
            }
            if (episodes.length) playUrlList.push(episodes);
        }
        return { playFromList: playFromList, playUrlList: playUrlList };
    },

    // 解析详情基本信息
    _parseVodInfo: function(html) {
        var getVal = function(reg, idx) {
            idx = idx || 1;
            var m = reg.exec(html);
            return m ? m[idx].trim() : '';
        };
        var parseNames = function(fragment) {
            var names = [];
            if (!fragment) return '';
            var m;
            var nameReg = />([^<]+)<\/a>/g;
            while ((m = nameReg.exec(fragment)) !== null) {
                if (m[1].trim()) names.push(m[1].trim());
            }
            return names.join(',');
        };
        var dataText = getVal(/<p class="data hidden-xs">类型：(.*?)<\/p>/);
        return {
            vod_name: getVal(/<h1 class="title">([^<]+)<\/h1>/),
            vod_pic: getVal(/data-original="([^"]+)"/),
            vod_type_name: getVal(/^(.*?)\s*\/\s*地区：/, 1, dataText),
            vod_year: getVal(/年份：(\d+)/, 1, dataText),
            vod_area: getVal(/\/\s*地区：(.*?)\s*\/\s*年份：/, 1, dataText),
            vod_remarks: getVal(/状态：<span[^>]*>([^<]+)<\/span>/),
            vod_director: parseNames(getVal(/导演：([\s\S]*?)<\/p>/)),
            vod_actor: parseNames(getVal(/主演：([\s\S]*?)<\/p>/)),
            vod_content: getVal(/<span class="detail-content"[^>]*>([\s\S]*?)<\/span>/) || getVal(/<span class="detail-sketch">([\s\S]*?)<\/span>/)
        };
    },

    // 封装请求（支持全局 req）
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
                // 降级 fetch
                fetch(url, options).then(function(res) { return res.text(); }).then(function(text) { resolve({ content: text }); }).catch(reject);
            }
        });
    }
};

// 导出规则（兼容 TVBox 的 __jsEvalReturn 方式）
export function __jsEvalReturn() {
    return rule;
}
