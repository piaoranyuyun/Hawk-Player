var rule = {
    title: '拾光影视',
    host: 'https://tv.time1080.xyz',
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    parseAPiUrl: 'https://svip.qlplayer.cyou/?url=',

    // ----- 初始化 -----
    init: function(cfg) {
        console.log('[拾光影视] Spider Init Done');
        // 可扩展：从 cfg 读取自定义 host 等
    },

    // ----- 首页分类（需返回分类列表）-----
    home: function(filter) {
        // 原代码未实现 home，这里返回默认分类（可从接口动态获取，但为简单，写死几个分类）
        // 实际分类会由 homeVod 返回的列表中的 type_name 动态生成，但 TVBox 需要先有分类定义
        // 从原接口 /api/proxy.php?action=home 可拿到 categories，但为避免额外请求，这里写死常见分类
        return JSON.stringify({
            class: [
                { id: '1', name: '电影' },
                { id: '2', name: '剧集' },
                { id: '4', name: '动漫' },
                { id: '3', name: '综艺' },
                { id: '26', name: '短剧' },
                { id: '24', name: '纪录片' }
            ],
            // 如果支持筛选，可添加 filters，暂不提供
        });
    },

    // ----- 首页推荐（会显示在首页）-----
    homeVod: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            var url = that.host + '/api/proxy.php?action=home';
            that.myFetch(url, {}, true).then(function(data) {
                var vodList = [];
                if (data && data.categories) {
                    for (var catName in data.categories) {
                        var items = data.categories[catName];
                        if (Array.isArray(items)) {
                            items.forEach(function(item) {
                                vodList.push({
                                    vod_id: item.id ? String(item.id) : '',
                                    vod_name: item.name || '',
                                    vod_pic: item.pic || '',
                                    vod_remarks: item.remarks || '',
                                    vod_blurb: item.content || '',
                                    vod_year: item.year || '',
                                    vod_area: item.area || '',
                                    type_name: item.type || catName
                                });
                            });
                        }
                    }
                }
                resolve(JSON.stringify({ list: vodList }));
            }).catch(function(err) {
                console.error('[拾光影视] homeVod error:', err);
                resolve(JSON.stringify({ list: [] }));
            });
        });
    },

    // ----- 分类列表（原代码未实现，这里返回空，或可模拟）-----
    category: function(tid, pg, filter, extend) {
        // 由于原接口可能没有分类列表，暂返回空
        // 若要实现，可模仿 homeVod 根据类型筛选，但需要后端支持，这里简单返回空
        return JSON.stringify({ list: [], pagecount: 1, page: 1 });
    },

    // ----- 搜索 -----
    search: function(kw, quick, pg) {
        var that = this;
        pg = pg || 1;
        return new Promise(function(resolve, reject) {
            var url = that.host + '/api/proxy.php?action=search&wd=' + encodeURIComponent(kw) + '&page=' + pg + '&source=qilin,mj';
            that.myFetch(url, {}, true).then(function(data) {
                var list = [];
                if (data && data.results && data.results.length > 0) {
                    list = data.results.map(function(item) {
                        return {
                            vod_id: item.id.toString(),
                            vod_name: item.name,
                            vod_pic: item.pic,
                            vod_remarks: item.remarks,
                            type_name: item.type
                        };
                    });
                }
                resolve(JSON.stringify({ pagecount: 1, list: list }));
            }).catch(function(err) {
                console.error('[拾光影视] search error:', err);
                resolve(JSON.stringify({ list: [] }));
            });
        });
    },

    // ----- 详情 -----
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var detailUrl = that.host + '/api/proxy.php?action=detail&source=qilin&id=' + id;
            that.myFetch(detailUrl, {}, true).then(function(data) {
                if (!data || !data.details || data.details.length === 0) {
                    resolve(JSON.stringify({ list: [] }));
                    return;
                }
                var item = data.details[0];
                // 提取播放源
                var playFrom = '';
                if (item.episodes && item.episodes.length > 0) {
                    playFrom = item.episodes.map(function(e) { return e.group; }).join('$$$');
                }
                var vod = {
                    vod_id: item.id,
                    vod_name: item.name,
                    vod_pic: item.pic,
                    type_name: item.type,
                    vod_year: item.year,
                    vod_area: item.area,
                    vod_lang: item.lang,
                    vod_director: item.director,
                    vod_actor: item.actor,
                    vod_content: item.content,
                    vod_remarks: item.remarks,
                    vod_play_from: playFrom,
                    vod_play_url: item.play_url   // 注意：这里可能是拼接好的播放链接
                };
                resolve(JSON.stringify({ list: [vod] }));
            }).catch(function(err) {
                console.error('[拾光影视] detail error:', err);
                resolve(JSON.stringify({ list: [] }));
            });
        });
    },

    // ----- 播放 -----
    play: function(flag, id, flags) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.parseVideoUrl(id).then(function(finalUrl) {
                resolve(JSON.stringify({ parse: 0, url: finalUrl }));
            }).catch(function(err) {
                console.error('[拾光影视] play error:', err);
                resolve(JSON.stringify({ msg: err.message }));
            });
        });
    },

    // ========================================
    // 内部辅助方法
    // ========================================

    safeJsonParse: function(json) {
        try {
            return typeof json === 'string' ? JSON.parse(json) : json;
        } catch (e) {
            return null;
        }
    },

    myFetch: function(url, options, needJsonParse) {
        var that = this;
        return new Promise(function(resolve, reject) {
            options = options || {};
            options.method = options.method || 'get';
            if (typeof req === 'function') {
                req(url, options, function(err, resp) {
                    if (err) {
                        reject(err);
                    } else {
                        var content = resp?.content;
                        if (needJsonParse !== false) {
                            resolve(that.safeJsonParse(content));
                        } else {
                            resolve(content);
                        }
                    }
                });
            } else {
                // 降级用 fetch
                fetch(url, options)
                    .then(function(res) { return res.text(); })
                    .then(function(text) {
                        if (needJsonParse !== false) {
                            resolve(that.safeJsonParse(text));
                        } else {
                            resolve(text);
                        }
                    })
                    .catch(reject);
            }
        });
    },

    // ----- 解析视频 -----
    parseVideoUrl: function(videoUrl) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (that.isDirectVideoUrl(videoUrl)) {
                console.log('[拾光影视] 直链无需解析，直接返回');
                resolve(videoUrl);
                return;
            }
            var resoleUrl = that.parseAPiUrl + videoUrl;
            console.log('[拾光影视] 解析地址:', resoleUrl);
            that.myFetch(resoleUrl, {}, false).then(function(html) {
                var config = that.extractConfig(html);
                if (!config.apiToken) {
                    reject(new Error('未获取到 apiToken'));
                    return;
                }
                var parseTokenUrl = 'https://svip.qlplayer.cyou/api/resolve.php?token=' + encodeURIComponent(config.apiToken);
                that.myFetch(parseTokenUrl, {}, true).then(function(data) {
                    if (!data || !data.url) {
                        reject(new Error('解析返回无 url'));
                        return;
                    }
                    var finalUrl = that.formatUrl(data.url);
                    console.log('[拾光影视] finalUrl:', finalUrl);
                    resolve(finalUrl);
                }).catch(reject);
            }).catch(reject);
        });
    },

    extractConfig: function(html) {
        var apiTokenMatch = html.match(/apiToken\s*:\s*["']([^"']+)["']/);
        return {
            apiToken: apiTokenMatch ? apiTokenMatch[1] : null
        };
    },

    formatUrl: function(url) {
        if (!url) return '';
        return url.replace(/\\/g, '').replace(/^(https?:\/)((?!\/))/i, '$1/');
    },

    isDirectVideoUrl: function(url) {
        return ['m3u', 'mp4'].some(function(item) { return (url + '').includes(item); });
    }
};
