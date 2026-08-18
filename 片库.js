var rule = {
    title: '片库',
    host: 'https://4k01.pianku.online',
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    parseAPiUrl: 'https://svip.qlplayer.cyou/?url=',
    // 预编译正则
    VOD_ITEM_REG: /<div class="vod-item">[\s\S]*?<a href="\/voddetail\/(\d+)\.html" title="(.*?)"[\s\S]*?<img src="(.*?)"[\s\S]*?<span class="remarks">(.*?)<\/span>/g,
    CLEAN_TAG_REG: /<[^>]+>/g,
    DIRECT_URL_REG: /\.(m3u8|mp4)/i,

    // ----- 初始化 -----
    init: function(cfg) {
        console.log('[片库] Spider Init Done');
        // 可扩展自定义 host
    },

    // ----- 首页分类和筛选 -----
    home: function(filter) {
        try {
            var classes = [
                { type_id: '20', type_name: '电影' },
                { type_id: '37', type_name: '剧集' },
                { type_id: '43', type_name: '动漫' },
                { type_id: '45', type_name: '综艺' }
            ];
            var filters = {
                '20': [{
                    key: 'tid',
                    name: '分类',
                    value: [
                        { n: '全部', v: '20' },
                        { n: '动作片', v: '21' }, { n: '喜剧片', v: '22' },
                        { n: '爱情片', v: '23' }, { n: '科幻片', v: '24' },
                        { n: '恐怖片', v: '25' }, { n: '剧情片', v: '26' },
                        { n: '战争片', v: '27' }, { n: '惊悚片', v: '28' },
                        { n: '犯罪片', v: '29' }, { n: '冒险篇', v: '30' },
                        { n: '动画片', v: '31' }, { n: '悬疑片', v: '32' },
                        { n: '武侠片', v: '33' }, { n: '奇幻片', v: '34' },
                        { n: '纪录片', v: '35' }, { n: '其他片', v: '36' }
                    ]
                }]
            };
            // 同时首页会拉取推荐列表，但这里不包含列表，列表由 homeVod 提供
            // 但原代码在 home 里也返回了 list，为了兼容，我们保留返回 list 的调用
            // 但为了不重复请求，可以在 home 中只返回分类，list 由 homeVod 返回
            // 但原代码是 home 里直接请求了首页列表，这里我们统一为：home 只返回分类，homeVod 返回推荐
            // 但原逻辑是 home 会返回 list，且 filter 参数控制是否返回 filters
            // 我们按原样：如果 filter 为 true，则返回 filters，否则不返回
            var result = { class: classes };
            if (filter) {
                result.filters = filters;
            }
            // 同时，原代码在 home 里也请求了首页列表并放在 list 中，但我们把列表放到 homeVod 里，避免重复
            // 因此这里不返回 list，仅返回 class 和 filters
            return JSON.stringify(result);
        } catch (e) {
            console.log('[片库] home error:', e.message);
            return JSON.stringify({ class: [], list: [] });
        }
    },

    // ----- 首页推荐（独立方法）-----
    homeVod: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                that.req(that.host, { headers: that.Headers() }).then(function(res) {
                    var list = that.getVodList(res.content || '');
                    resolve(JSON.stringify({ list: list }));
                }).catch(function(e) {
                    console.log('[片库] homeVod error:', e.message);
                    resolve(JSON.stringify({ list: [] }));
                });
            } catch (e) {
                resolve(JSON.stringify({ list: [] }));
            }
        });
    },

    // ----- 分类列表（带分页和筛选）-----
    category: function(tid, pg, filter, extend) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var realTid = (extend && extend.tid) ? extend.tid : tid;
                var page = pg || '1';
                var url = page === '1' ? that.host + '/vodtype/' + realTid + '.html' : that.host + '/vodtype/' + realTid + '-' + page + '.html';
                console.log('[片库] category url:', url);
                that.req(url, { headers: that.Headers() }).then(function(res) {
                    var html = res.content || '';
                    var list = that.getVodList(html);
                    var pagecount = parseInt(page) + 1;
                    var total = 0;
                    var pageMatch = html.match(/尾页.*?href=".*?-(\d+)\.html"/);
                    if (pageMatch) {
                        pagecount = parseInt(pageMatch[1]);
                        total = pagecount * 24;
                    }
                    resolve(JSON.stringify({
                        list: list,
                        page: parseInt(page),
                        pagecount: pagecount,
                        limit: 24,
                        total: total
                    }));
                }).catch(reject);
            } catch (e) {
                console.log('[片库] category error:', e.message);
                resolve(JSON.stringify({ list: [], page: 1, pagecount: 1, limit: 24, total: 0 }));
            }
        });
    },

    // ----- 搜索 -----
    search: function(key, quick, pg) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var encodedKey = encodeURIComponent(key);
                var url = that.host + '/vodsearch/-------------.html?wd=' + encodedKey;
                console.log('[片库] search url:', url);
                that.req(url, { headers: that.Headers() }).then(function(res) {
                    var list = that.getVodList(res.content || '');
                    resolve(JSON.stringify({ list: list, page: 1, pagecount: 1 }));
                }).catch(reject);
            } catch (e) {
                console.log('[片库] search error:', e.message);
                resolve(JSON.stringify({ list: [] }));
            }
        });
    },

    // ----- 详情 -----
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var url = that.host + '/voddetail/' + id + '.html';
                console.log('[片库] detail url:', url);
                that.req(url, { headers: that.Headers() }).then(function(res) {
                    var html = res.content || '';
                    var getMatch = function(re) {
                        var m = html.match(re);
                        return m ? m[1].trim() : '';
                    };
                    var title = getMatch(/<h1[^>]*class="detail-title"[^>]*>(.*?)(?:<span|<\/h1>)/s);
                    var pic = getMatch(/class="detail-poster"[^>]*>[\s\S]*?<img src="(.*?)"/);
                    if (pic) pic = that.buildUrl(pic);
                    var remarks = getMatch(/class="detail-remarks"[^>]*>(.*?)<\/span>/);
                    var content = getMatch(/class="detail-desc"[^>]*>[\s\S]*?<p>(.*?)<\/p>/);
                    // 提取元数据
                    var director = '', actor = '', area = '', year = '';
                    var metaRegex = /<(?:span|p|div)[^>]*>(导演|主演|地区|年份)[：:](.*?)(?:<\/span>|<\/p>|<\/div>)/g;
                    var metaMatch;
                    while ((metaMatch = metaRegex.exec(html)) !== null) {
                        var key = metaMatch[1];
                        var val = metaMatch[2].replace(that.CLEAN_TAG_REG, '').trim();
                        if (key === '导演') director = val;
                        else if (key === '主演') actor = val;
                        else if (key === '地区') area = val;
                        else if (key === '年份') year = val;
                    }
                    // 提取播放线路
                    var playFromList = [];
                    var tabRegex = /class="source-tab-item[^"]*"[^>]*>(.*?)<\/span>/g;
                    var tabMatch;
                    while ((tabMatch = tabRegex.exec(html)) !== null) {
                        var from = tabMatch[1].trim();
                        if (from.includes('自营4K60帧') || from.includes('自营4k60帧')) {
                            from = '⚡' + from + '(注意直连)';
                        }
                        playFromList.push(from);
                    }
                    // 提取剧集
                    var playUrlList = [];
                    var panes = html.split('class="source-pane');
                    for (var i = 1; i < panes.length; i++) {
                        var paneHtml = panes[i].split('</div>')[0] || panes[i];
                        var episodes = [];
                        var epRegex = /href="(\/vodplay\/[^"]+)"[^>]*>(.*?)<\/a>/g;
                        var epMatch;
                        while ((epMatch = epRegex.exec(paneHtml)) !== null) {
                            var epName = epMatch[2].replace(that.CLEAN_TAG_REG, '').trim();
                            var epUrl = that.buildUrl(epMatch[1]);
                            episodes.push(epName + '$' + epUrl);
                        }
                        if (episodes.length > 0) {
                            playUrlList.push(episodes.join('#'));
                        }
                    }
                    if (playFromList.length === 0 && playUrlList.length > 0) {
                        for (var j = 0; j < playUrlList.length; j++) {
                            playFromList.push('线路 ' + (j + 1));
                        }
                    }
                    var vod = {
                        vod_id: id,
                        vod_name: title,
                        vod_pic: pic,
                        vod_type_name: '',
                        vod_year: year,
                        vod_area: area,
                        vod_remarks: remarks,
                        vod_actor: actor,
                        vod_director: director,
                        vod_content: content,
                        vod_play_from: playFromList.join('$$$'),
                        vod_play_url: playUrlList.join('$$$')
                    };
                    console.log('[片库] 解析详情成功:', title);
                    resolve(JSON.stringify({ list: [vod] }));
                }).catch(reject);
            } catch (e) {
                console.log('[片库] detail error:', e.message);
                resolve(JSON.stringify({ list: [] }));
            }
        });
    },

    // ----- 播放 -----
    play: function(flag, id, flags) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var playUrl = that.buildUrl(id);
                console.log('[片库] 获取播放地址:', playUrl);
                that.req(playUrl, { headers: that.Headers() }).then(function(res) {
                    var html = res.content || '';
                    var match = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})/);
                    if (match && match[1]) {
                        var playerData = JSON.parse(match[1]);
                        var targetUrl = playerData.url || '';
                        if (that.isDirectVideoUrl(targetUrl)) {
                            console.log('[片库] 直连播放:', targetUrl);
                            resolve(JSON.stringify({ parse: 0, url: targetUrl }));
                            return;
                        }
                        that.parseVideoUrl(targetUrl).then(function(finalUrl) {
                            resolve(JSON.stringify({ parse: 0, url: finalUrl }));
                        }).catch(function(e) {
                            console.log('[片库] 解析视频失败:', e.message);
                            resolve(JSON.stringify({ parse: 0, url: '' }));
                        });
                    } else {
                        console.log('[片库] 未找到 player_aaaa');
                        resolve(JSON.stringify({ parse: 0, url: '' }));
                    }
                }).catch(function(e) {
                    console.log('[片库] 播放请求失败:', e.message);
                    resolve(JSON.stringify({ parse: 0, url: '' }));
                });
            } catch (e) {
                console.log('[片库] play error:', e.message);
                resolve(JSON.stringify({ parse: 0, url: '' }));
            }
        });
    },

    // ========================================
    // 辅助方法
    // ========================================

    Headers: function() {
        return { 'User-Agent': this.UA };
    },

    buildUrl: function(path) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return this.host + (path.startsWith('/') ? '' : '/') + path;
    },

    getVodList: function(html) {
        if (!html) return [];
        var list = [];
        var reg = this.VOD_ITEM_REG;
        reg.lastIndex = 0;
        var match;
        while ((match = reg.exec(html)) !== null) {
            list.push({
                vod_id: match[1],
                vod_name: match[2],
                vod_pic: this.buildUrl(match[3]),
                vod_remarks: match[4].trim()
            });
        }
        console.log('[片库] 提取到 ' + list.length + ' 条数据');
        return list;
    },

    isDirectVideoUrl: function(url) {
        return this.DIRECT_URL_REG.test(url);
    },

    formatUrl: function(url) {
        if (!url) return '';
        return url.replace(/\\/g, '').replace(/^(https?:\/)((?!\/))/i, '$1/');
    },

    extractConfig: function(html) {
        var match = html.match(/apiToken\s*:\s*["']([^"']+)["']/);
        return { apiToken: match ? match[1] : null };
    },

    parseVideoUrl: function(url) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var resoleUrl = that.parseAPiUrl + url;
                console.log('[片库] 解析地址:', resoleUrl);
                that.req(resoleUrl, { headers: that.Headers() }).then(function(res) {
                    var html = res.content || '';
                    var config = that.extractConfig(html);
                    if (!config.apiToken) {
                        reject(new Error('未获取到 apiToken'));
                        return;
                    }
                    var parseTokenUrl = 'https://svip.qlplayer.cyou/api/resolve.php?token=' + encodeURIComponent(config.apiToken);
                    console.log('[片库] parseTokenUrl:', parseTokenUrl);
                    that.req(parseTokenUrl, { headers: that.Headers() }).then(function(res2) {
                        var data = JSON.parse(res2.content);
                        var finalUrl = that.formatUrl(data.url);
                        console.log('[片库] finalUrl:', finalUrl);
                        resolve(finalUrl);
                    }).catch(reject);
                }).catch(reject);
            } catch (e) {
                console.log('[片库] parseVideoUrl 错误:', e.message);
                reject(e);
            }
        });
    },

    // 通用请求封装（支持全局 req 或 fetch 降级）
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

// 导出规则（兼容 TVBox 的 __jsEvalReturn）
export function __jsEvalReturn() {
    return rule;
}
