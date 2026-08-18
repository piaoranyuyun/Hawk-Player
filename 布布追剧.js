var rule = {
    title: '布布追剧',
    host: 'https://bubutv.top',
    pkg: 'com.sunshine.tv',
    ver: '4',
    device_id_cache_key: 'com.sunshine.tv_3qys_B7k7Dt56Rn',
    device_id: '',

    // 初始化（不需要修改 host）
    init: function(cfg) {
        // 保持 host 硬编码，不覆盖
    },

    // 首页（分类 + 推荐列表）
    home: function(filter) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getHeaders().then(function(hd) {
                return that.req(that.host + '/api.php/app/index/home', { headers: hd });
            }).then(function(resp) {
                var json = JSON.parse(resp.content);
                var classes = json.data.categories.map(function(cat) {
                    return { type_id: cat.type_name, type_name: cat.type_name };
                });
                var videos = [];
                json.data.categories.forEach(function(cat) {
                    videos = videos.concat(that.arr2vods(cat.videos));
                });
                resolve(JSON.stringify({ class: classes, list: videos }));
            }).catch(function(e) {
                reject(e);
            });
        });
    },

    homeVod: function() {
        return JSON.stringify({ list: [] });
    },

    // 分类
    category: function(tid, pg, filter, extend) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getHeaders().then(function(hd) {
                var url = that.host + '/api.php/app/filter/vod?type_name=' + encodeURIComponent(tid) + '&page=' + pg + '&sort=hits';
                return that.req(url, { headers: hd });
            }).then(function(resp) {
                var json = JSON.parse(resp.content);
                resolve(JSON.stringify({
                    list: that.arr2vods(json.data),
                    pagecount: json.pageCount,
                    page: parseInt(pg)
                }));
            }).catch(reject);
        });
    },

    // 搜索
    search: function(wd, quick, pg) {
        pg = pg || 1;
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getHeaders().then(function(hd) {
                var url = that.host + '/api.php/app/search/index?wd=' + encodeURIComponent(wd) + '&page=' + pg + '&limit=15';
                return that.req(url, { headers: hd });
            }).then(function(resp) {
                var json = JSON.parse(resp.content);
                resolve(JSON.stringify({
                    list: that.arr2vods(json.data),
                    pagecount: json.pageCount,
                    page: pg
                }));
            }).catch(reject);
        });
    },

    // 详情
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getHeaders().then(function(hd) {
                return that.req(that.host + '/api.php/app/vod/get_detail?vod_id=' + id, { headers: hd });
            }).then(function(resp) {
                var json = JSON.parse(resp.content);
                var data = json.data[0];
                var vodplayer = json.vodplayer;
                var shows = [];
                var play_urls = [];
                var raw_shows = data.vod_play_from.split('$$$');
                var raw_urls_list = data.vod_play_url.split('$$$');
                for (var i = 0; i < raw_shows.length; i++) {
                    var show_code = raw_shows[i];
                    var urls_str = raw_urls_list[i];
                    var need_parse = 0;
                    var is_show = 0;
                    var name = show_code;
                    var player_info = vodplayer.find(function(p) { return p.from === show_code; });
                    if (player_info) {
                        is_show = 1;
                        need_parse = player_info.decode_status;
                        if (show_code.toLowerCase() !== player_info.show.toLowerCase()) {
                            name = player_info.show + ' (' + show_code + ')';
                        }
                    }
                    if (is_show === 1) {
                        var urls = [];
                        var items = urls_str.split('#');
                        for (var j = 0; j < items.length; j++) {
                            var item = items[j];
                            if (item.indexOf('$') > -1) {
                                var parts = item.split('$');
                                var episode = parts[0];
                                var url = parts[1];
                                urls.push(episode + '$' + show_code + '@' + need_parse + '@' + url);
                            }
                        }
                        if (urls.length > 0) {
                            play_urls.push(urls.join('#'));
                            shows.push(name);
                        }
                    }
                }
                var video = {
                    vod_id: data.vod_id.toString(),
                    vod_name: data.vod_name,
                    vod_pic: data.vod_pic,
                    vod_remarks: data.vod_remarks,
                    vod_year: data.vod_year,
                    vod_area: data.vod_area,
                    vod_actor: data.vod_actor,
                    vod_director: data.vod_director,
                    vod_content: data.vod_content,
                    vod_play_from: shows.join('$$$'),
                    vod_play_url: play_urls.join('$$$'),
                    type_name: data.vod_class
                };
                resolve(JSON.stringify({ list: [video] }));
            }).catch(reject);
        });
    },

    // 播放
    play: function(flag, vid, flags) {
        var that = this;
        var parts = vid.split('@');
        var play_from = parts[0];
        var need_parse = parts[1];
        var raw_url = parts[2];
        var url = '';
        var jx = 0;
        return new Promise(function(resolve, reject) {
            if (need_parse === '1') {
                that.getHeaders().then(function(hd) {
                    var apiUrl = that.host + '/api.php/app/decode/url/?url=' + encodeURIComponent(raw_url) + '&vodFrom=' + play_from;
                    return that.req(apiUrl, { headers: hd, timeout: 30000 });
                }).then(function(resp) {
                    var json = JSON.parse(resp.content);
                    if (json.data && json.data.startsWith('http')) {
                        url = json.data;
                    }
                    finish();
                }).catch(function(e) {
                    console.error('Play decode error:', e);
                    finish();
                });
            } else {
                finish();
            }

            function finish() {
                if (!url) {
                    url = raw_url;
                    if (/(www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(raw_url)) {
                        jx = 1;
                    }
                }
                resolve(JSON.stringify({
                    jx: jx,
                    parse: 0,
                    url: url,
                    header: { 'User-Agent': 'com.sunshine.tv/1.2.0 (Linux;Android 15) AndroidXMedia3/1.4.1' }
                }));
            }
        });
    },

    // ----- 辅助方法 -----
    getHeaders: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            var timestamp = Math.floor(Date.now() / 1000).toString();
            var nonce = that.randomStr(3, '0123456789');
            if (!that.device_id) {
                local.get('cache', that.device_id_cache_key).then(function(val) {
                    if (val && val.length === 16) {
                        that.device_id = val;
                    } else {
                        that.device_id = that.randomStr(16);
                        local.set('cache', that.device_id_cache_key, that.device_id);
                    }
                    resolve(that.buildHeaders(timestamp, nonce));
                }).catch(function() {
                    that.device_id = that.randomStr(16);
                    local.set('cache', that.device_id_cache_key, that.device_id);
                    resolve(that.buildHeaders(timestamp, nonce));
                });
            } else {
                resolve(that.buildHeaders(timestamp, nonce));
            }
        });
    },

    buildHeaders: function(timestamp, nonce) {
        var sign_str = 'finger=SF-C3B2B41F6EFFFF9869176CF68F6790E8F07506FC88632C94B4F5F0430D5498CA&id=' + this.pkg + '&nonce=' + nonce + '&sk=SK-thanks&time=' + timestamp + '&v=' + this.ver;
        var sign = this.sha256(sign_str);
        return {
            'User-Agent': 'okhttp/4.12.0',
            'Accept': 'application/json',
            'x-aid': this.pkg,
            'x-ave': this.ver,
            'x-time': timestamp,
            'x-nonc': nonce,
            'x-sign': sign,
            'x-device-id': this.device_id,
            'x-device-brand': 'vivo',
            'x-device-model': 'V2309A',
            'x-update-id': '0245861b-2ebf-5524-389d-f983830651ec'
        };
    },

    arr2vods: function(arr) {
        var that = this;
        return arr.map(function(i) {
            var type_name = i.type_name || '';
            if (i.vod_class) {
                type_name = type_name + (type_name ? ',' : '') + i.vod_class;
            }
            return {
                vod_id: i.vod_id.toString(),
                vod_name: i.vod_name,
                vod_pic: i.vod_pic,
                vod_remarks: i.vod_remarks,
                type_name: type_name,
                vod_year: i.vod_year
            };
        });
    },

    randomStr: function(len, chars) {
        chars = chars || '0123456789abcdef';
        var str = '';
        for (var i = 0; i < len; i++) {
            str += chars[Math.floor(Math.random() * chars.length)];
        }
        return str;
    },

    sha256: function(text) {
        // 使用 App 提供的 Crypto 对象（通常全局可用）
        return Crypto.SHA256(text).toString().toUpperCase();
    },

    // 网络请求封装（App 一般提供 req 函数）
    req: function(url, options) {
        return new Promise(function(resolve, reject) {
            // 如果 App 有全局 req 则使用，否则用 fetch
            if (typeof req === 'function') {
                req(url, options, function(err, resp) {
                    if (err) reject(err);
                    else resolve(resp);
                });
            } else {
                // 降级方案（一般不会用到）
                fetch(url, options).then(function(res) {
                    return res.text();
                }).then(function(text) {
                    resolve({ content: text });
                }).catch(reject);
            }
        });
    }
};
