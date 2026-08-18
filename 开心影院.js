var rule = {
    title: '开心影院',
    // 从多个镜像站点中选一个可用的（默认使用 sites[5]）
    host: 'https://www.kxyy6.cc',
    sites: [
        'https://www.kxyy1.cc',
        'https://www.kxyy2.cc',
        'https://www.kxyy3.cc',
        'https://www.kxyy4.cc',
        'https://www.kxyy5.cc',
        'https://www.kxyy6.cc',
        'https://www.kxyy7.cc',
        'https://www.kxyy8.cc',
        'https://www.kxyy9.cc'
    ],
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

    // ----- 初始化（可在此切换站点） -----
    init: function(cfg) {
        // 如果配置中传递了自定义站点，则覆盖
        if (cfg && cfg.host) {
            this.host = cfg.host;
        }
        // 还可以从 cfg.ext 等读取，但不需要
    },

    // ----- 首页分类 + 筛选器 -----
    home: function(filter) {
        return JSON.stringify({
            class: [
                { id: "1", name: "电影" },
                { id: "2", name: "剧集" },
                { id: "4", name: "动漫" },
                { id: "3", name: "综艺" },
                { id: "26", name: "短剧" },
                { id: "24", name: "纪录片" }
            ],
            filters: this.getFilter()
        });
    },

    // ----- 首页推荐（可返回空或一些推荐）-----
    homeVod: function() {
        // 这里可以返回推荐视频列表，为了简单返回空
        return JSON.stringify({ list: [] });
    },

    // ----- 分类列表（带分页和筛选）-----
    category: function(tid, pg, filter, ext) {
        var that = this;
        var by = (ext && ext.orderby) || filter?.orderby || 'hits_week';
        var type = (ext && ext.type) || filter?.type || '';
        var page = pg || 1;
        var url = this.host + '/vodshow/' + tid + '--' + by + '-' + type + '-----' + page + '---.html';
        console.log('category url:', url);
        return this._parseVodList(url);
    },

    // ----- 搜索（未实现，返回空）-----
    search: function(wd, quick, pg) {
        // 可以尝试实现，但开心影院搜索可能需要特殊处理，暂时返回空
        return JSON.stringify({ list: [], pagecount: 0, page: 1 });
    },

    // ----- 详情 -----
    detail: function(tid) {
        var that = this;
        var url = this.host + tid;
        console.log('detail url:', url);
        return this._parseDetailVod(url);
    },

    // ----- 播放 -----
    play: function(flag, id, vipFlags) {
        return this._parsePlay(id);
    },

    // ========================================
    // 内部辅助方法
    // ========================================

    // 获取筛选器（原样保留）
    getFilter: function() {
        var OrderByFilter = {
            "key": "orderby",
            "name": "排序",
            "value": [
                { "n": "默认排序", "v": "" },
                { "n": "更新时间", "v": "time" },
                { "n": "近期热门", "v": "hits_week" },
                { "n": "豆瓣评分", "v": "douban_score" }
            ]
        };
        return {
            "1": [
                {
                    "key": "type",
                    "name": "类别",
                    "value": [
                        { "n": "默认类别", "v": "" },
                        { "n": "科幻", "v": "科幻" },
                        { "n": "剧情", "v": "剧情" },
                        { "n": "惊悚", "v": "惊悚" },
                        { "n": "爱情", "v": "爱情" },
                        { "n": "古装", "v": "古装" },
                        { "n": "动作", "v": "动作" },
                        { "n": "悬疑", "v": "悬疑" },
                        { "n": "犯罪", "v": "犯罪" },
                        { "n": "谍战", "v": "谍战" },
                        { "n": "历史", "v": "历史" },
                        { "n": "喜剧", "v": "喜剧" },
                        { "n": "奇幻", "v": "奇幻" },
                        { "n": "家庭", "v": "家庭" },
                        { "n": "青春", "v": "青春" },
                        { "n": "冒险", "v": "冒险" },
                        { "n": "纪录", "v": "纪录" },
                        { "n": "动画", "v": "动画" },
                        { "n": "人物", "v": "人物" },
                        { "n": "文化", "v": "文化" },
                        { "n": "其他", "v": "其他" }
                    ]
                }, OrderByFilter
            ],
            "2": [
                {
                    "key": "type",
                    "name": "类型",
                    "value": [
                        { "n": "不限", "v": "" },
                        { "n": "爱情", "v": "爱情" },
                        { "n": "古装", "v": "古装" },
                        { "n": "悬疑", "v": "悬疑" },
                        { "n": "都市", "v": "都市" },
                        { "n": "喜剧", "v": "喜剧" },
                        { "n": "战争", "v": "战争" },
                        { "n": "剧情", "v": "剧情" },
                        { "n": "青春", "v": "青春" },
                        { "n": "历史", "v": "历史" },
                        { "n": "网剧", "v": "网剧" },
                        { "n": "奇幻", "v": "奇幻" },
                        { "n": "冒险", "v": "冒险" },
                        { "n": "励志", "v": "励志" },
                        { "n": "犯罪", "v": "犯罪" },
                        { "n": "商战", "v": "商战" },
                        { "n": "恐怖", "v": "恐怖" },
                        { "n": "穿越", "v": "穿越" },
                        { "n": "农村", "v": "农村" },
                        { "n": "人物", "v": "人物" },
                        { "n": "商业", "v": "商业" },
                        { "n": "生活", "v": "生活" },
                        { "n": "其他", "v": "其他" }
                    ]
                }, OrderByFilter
            ],
            "4": [
                {
                    "key": "type",
                    "name": "类型",
                    "value": [
                        { "n": "不限", "v": "" },
                        { "n": "少年", "v": "少年" },
                        { "n": "热血", "v": "热血" },
                        { "n": "科幻", "v": "科幻" },
                        { "n": "冒险", "v": "冒险" },
                        { "n": "动画", "v": "动画" },
                        { "n": "爱情", "v": "爱情" },
                        { "n": "奇幻", "v": "奇幻" },
                        { "n": "武侠", "v": "武侠" },
                        { "n": "悬疑", "v": "悬疑" },
                        { "n": "惊悚", "v": "惊悚" },
                        { "n": "剧情", "v": "剧情" },
                        { "n": "音乐", "v": "音乐" },
                        { "n": "恐怖", "v": "恐怖" },
                        { "n": "喜剧", "v": "喜剧" },
                        { "n": "儿童", "v": "儿童" }
                    ]
                }, OrderByFilter
            ],
            "3": [
                {
                    "key": "type",
                    "name": "类型",
                    "value": [
                        { "n": "不限", "v": "" },
                        { "n": "真人秀", "v": "真人秀" },
                        { "n": "脱口秀", "v": "脱口秀" },
                        { "n": "喜剧", "v": "喜剧" },
                        { "n": "音乐", "v": "音乐" },
                        { "n": "爱情", "v": "爱情" },
                        { "n": "家庭", "v": "家庭" },
                        { "n": "歌舞", "v": "歌舞" }
                    ]
                }, OrderByFilter
            ],
            "26": [OrderByFilter],
            "24": [OrderByFilter]
        };
    },

    // 安全解析 JSON
    safeJsonParse: function(json) {
        try {
            return typeof json === "string" ? JSON.parse(json) : json;
        } catch (e) {
            return json;
        }
    },

    // 自定义 fetch（使用全局 req）
    myFetch: function(url, options) {
        var that = this;
        return new Promise(function(resolve, reject) {
            options = options || {};
            options.method = options.method || 'get';
            // 如果全局有 req 函数则使用
            if (typeof req === 'function') {
                req(url, options, function(err, resp) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(that.safeJsonParse(resp?.content));
                    }
                });
            } else {
                // 降级使用 fetch
                fetch(url, options)
                    .then(function(res) { return res.text(); })
                    .then(function(text) { resolve(that.safeJsonParse(text)); })
                    .catch(reject);
            }
        });
    },

    // 解析视频列表（分类页）
    _parseVodList: function(url) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.myFetch(url).then(function(html) {
                // 使用全局 cheerio（TVBox 通常内置）
                var $ = cheerio.load(html);
                var list = [];
                $('.row.row-cards > div').each(function(index, el) {
                    var $el = $(el);
                    var vod_id = $el.find('a.cover2').attr('href') || '';
                    var vod_pic = $el.find('img').attr('src') || '';
                    var vod_name = $el.find('.card-title').text().trim() || '';
                    var vod_remarks = $el.find('.badge').text().trim() || '';
                    var vod_year = $el.find('.card-body p.text-muted').text().trim() || '';
                    if (vod_name) {
                        list.push({
                            vod_id: vod_id,
                            vod_pic: vod_pic,
                            vod_name: vod_name,
                            vod_remarks: vod_remarks,
                            vod_year: vod_year
                        });
                    }
                });
                resolve(JSON.stringify({ list: list }));
            }).catch(function(err) {
                resolve(JSON.stringify({ msg: err.message }));
            });
        });
    },

    // 解析详情
    _parseDetailVod: function(url) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.myFetch(url).then(function(html) {
                var $ = cheerio.load(html);
                var vod = {
                    vod_name: '',
                    vod_pic: '',
                    vod_remarks: '',
                    type_name: '',
                    vod_director: '',
                    vod_actor: '',
                    vod_year: '',
                    vod_area: '',
                    vod_content: '',
                    vod_play_from: '',
                    vod_play_url: ''
                };
                // 提取基本信息
                that._parseDetailBaseInfo($, vod);
                // 提取线路和剧集
                that._parseDetailPlayList($, vod);
                resolve(JSON.stringify({ list: [vod] }));
            }).catch(function(err) {
                resolve(JSON.stringify({ msg: err.message }));
            });
        });
    },

    // 解析详情基本信息
    _parseDetailBaseInfo: function($, vod) {
        vod.vod_name = $('h1.d-none.d-md-block').text().trim() || $('h2.d-sm-block.d-md-none').text().trim();
        vod.vod_pic = $('.col-md-auto.col-5.cover-lg-max-25 img').attr('src') || '';
        vod.vod_remarks = $('.text-orange').first().text().trim() || '';

        $('.col.mb-2 p').each(function(index, el) {
            var $p = $(el);
            var strongText = $p.find('strong').text().replace('：', '').trim();
            if (strongText === '导演') {
                var directors = [];
                $p.find('a').each(function(i, a) { directors.push($(a).text().trim()); });
                vod.vod_director = directors.join(',');
            } else if (strongText === '主演') {
                var actors = [];
                $p.find('a').each(function(i, a) { actors.push($(a).text().trim()); });
                vod.vod_actor = actors.join(',');
            } else if (strongText === '类型') {
                vod.type_name = $p.find('a').text().trim();
            } else if (strongText === '制片国家/地区') {
                var areaText = $p.text().replace('制片国家/地区：', '').trim();
                vod.vod_area = areaText.replace(/[\[\]]/g, '');
            } else if (strongText === '首播' || strongText === '上映时间') {
                var releaseDate = $p.text().replace(strongText + '：', '').trim();
                var match = releaseDate.match(/\d{4}/);
                if (match) vod.vod_year = match[0];
            }
        });
        vod.vod_content = $('#synopsis').text().trim().replace(/\s+/g, ' ') || '';
    },

    // 解析详情线路和剧集
    _parseDetailPlayList: function($, vod) {
        var playFromArr = [];
        var playUrlArr = [];
        var tabNavItems = $('.nav.nav-tabs li.nav-item');
        if (tabNavItems.length > 0) {
            tabNavItems.each(function(index, li) {
                var $a = $(li).find('a');
                var hrefId = $a.attr('href');
                var fromName = $a.clone().children().remove().end().text().trim() || ('线路' + (index + 1));
                playFromArr.push(fromName);
                var episodes = [];
                if (hrefId) {
                    $(hrefId + ' a.btn').each(function(i, btn) {
                        var $btn = $(btn);
                        var name = $btn.text().trim();
                        var href = $btn.attr('href');
                        if (name && href) episodes.push(name + '$' + href);
                    });
                }
                playUrlArr.push(episodes.join('#'));
            });
        }
        // 兼容旧版 ul.playlist
        if (playFromArr.length === 0) {
            $('ul.playlist').each(function(index, ul) {
                var fromName = $(ul).siblings('h4').text().trim() || ('线路' + (index + 1));
                playFromArr.push(fromName);
                var episodes = [];
                $(ul).find('li').each(function(i, li) {
                    var val = $(li).find('input').attr('value');
                    if (val && val.includes('$')) episodes.push(val);
                });
                playUrlArr.push(episodes.join('#'));
            });
        }
        // 兜底
        if (playFromArr.length === 0) {
            playFromArr.push('默认线路');
            var episodes = [];
            $('.play-list a, .anthology-list-play a').each(function(i, a) {
                var name = $(a).text().trim();
                var href = $(a).attr('href');
                if (name && href) episodes.push(name + '$' + href);
            });
            playUrlArr.push(episodes.join('#'));
        }
        vod.vod_play_from = playFromArr.join('$$$');
        vod.vod_play_url = playUrlArr.join('$$$');
    },

    // 播放解析
    _parsePlay: function(id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var playPageUrl = that.host + id;
            console.log('playPageUrl:', playPageUrl);
            that.myFetch(playPageUrl).then(function(html) {
                // 正则匹配 "url": "..."
                var urlMatch = html.match(/"url"\s*:\s*"([^"]+)"/);
                if (urlMatch && urlMatch[1]) {
                    var videoUrl = that.fixUrl(urlMatch[1]);
                    console.log('videoUrl after fix:', videoUrl);
                    if (that.isDirectVideoUrl(videoUrl)) {
                        resolve(JSON.stringify({ parse: 0, url: videoUrl }));
                        return;
                    }
                    var get_signed_url = that.host + '/static/player/nby.php?get_signed_url=1&url=' + encodeURIComponent(videoUrl);
                    console.log('get_signed_url:', get_signed_url);
                    that.myFetch(get_signed_url).then(function(res) {
                        var signed_url = res?.signed_url;
                        if (!signed_url) {
                            throw new Error('未能获取到签名播放地址');
                        }
                        var getjmurl = that.host + '/static/player/nby.php' + signed_url;
                        that.myFetch(getjmurl).then(function(res2) {
                            var jmurl = res2?.jmurl;
                            if (!jmurl) {
                                throw new Error('未能获取到解密后的播放地址');
                            }
                            jmurl = that.fixUrl(jmurl);
                            console.log('jmurl:', jmurl);
                            resolve(JSON.stringify({ parse: 0, url: jmurl }));
                        }).catch(function(err) {
                            resolve(JSON.stringify({ parse: 0, url: '', msg: err.message }));
                        });
                    }).catch(function(err) {
                        resolve(JSON.stringify({ parse: 0, url: '', msg: err.message }));
                    });
                } else {
                    resolve(JSON.stringify({ parse: 0, url: '', msg: '未能匹配到player_data的url字段' }));
                }
            }).catch(function(err) {
                resolve(JSON.stringify({ parse: 0, url: '', msg: err.message }));
            });
        });
    },

    // 工具函数：判断是否直接可播放视频链接
    isDirectVideoUrl: function(url) {
        return url.startsWith('http') && (url.includes('.mp4') || url.includes('.m3u8'));
    },

    // 解码转义字符（处理 \/ 和 \u）
    fixUrl: function(url) {
        if (typeof url !== 'string') return '';
        try {
            return JSON.parse('"' + url + '"');
        } catch (e) {
            return url;
        }
    }
};
