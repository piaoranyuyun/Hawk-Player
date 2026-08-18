var rule = {
    title: '91Porn',
    host: 'https://91porn.com',
    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',

    // 分类配置（来自原 appConfig.tabs）
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
    ],

    // ----- 初始化 -----
    init: function(cfg) {
        // 可在此处从 cfg 读取自定义 host 等
    },

    // ----- 首页分类 -----
    home: function(filter) {
        var classes = this.tabs.map(function(tab) {
            return { type_id: tab.id, type_name: tab.name };
        });
        return JSON.stringify({ class: classes });
    },

    // ----- 首页推荐（返回第一页分类内容）-----
    homeVod: function() {
        // 直接返回第一个分类的第一页
        return this.category('ori', 1);
    },

    // ----- 分类列表（带分页）-----
    category: function(tid, pg, filter, extend) {
        var that = this;
        pg = pg || 1;
        return new Promise(function(resolve, reject) {
            var url = that.host + '/index.php?category=' + tid + '&viewtype=basic';
            if (parseInt(pg) > 1) {
                url += '&page=' + pg;
            }
            that.req(url, { headers: { 'User-Agent': that.UA } }).then(function(res) {
                var html = res.content || '';
                var $ = cheerio.load(html);
                var list = [];
                $('.col-xs-12.col-sm-4.col-md-3.col-lg-3').each(function(_, element) {
                    var $el = $(element);
                    var href = $el.find('a').attr('href');
                    var title = $el.find('.video-title').text().trim();
                    var cover = $el.find('img').attr('src');
                    var duration = $el.find('.duration').text().trim();
                    var author = $el.find('.info').eq(1).text().trim();
                    if (href) {
                        list.push({
                            vod_id: href,  // 详情页相对路径
                            vod_name: title || '无标题',
                            vod_pic: cover || '',
                            vod_remarks: (author ? author + ' | ' : '') + duration,
                            ext: { url: href }
                        });
                    }
                });
                // 简单分页（原代码未提供总页数，这里假设下一页存在）
                var pagecount = parseInt(pg) + 1; // 粗略估计
                resolve(JSON.stringify({ list: list, pagecount: pagecount, page: parseInt(pg) }));
            }).catch(function(err) {
                resolve(JSON.stringify({ list: [], pagecount: 1, page: 1, msg: err.message }));
            });
        });
    },

    // ----- 搜索（原代码未实现，返回空）-----
    search: function(wd, quick, pg) {
        return JSON.stringify({ list: [], pagecount: 1 });
    },

    // ----- 详情（获取播放地址）-----
    detail: function(id) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var url = that.host + id; // id 是相对路径，如 /view_video.php?viewkey=xxx
            that.req(url, { headers: { 'User-Agent': that.UA } }).then(function(res) {
                var html = res.content || '';
                // 提取 MP4 地址
                var mp4Match = html.match(/<source src="(https?:\/\/[^"]+\.mp4[^"]*)"/);
                var playUrl = mp4Match ? mp4Match[1] : '';
                var vod = {
                    vod_id: id,
                    vod_name: '视频详情',
                    vod_pic: '',
                    vod_remarks: '',
                    vod_play_from: '默认',
                    vod_play_url: playUrl ? '默认$' + playUrl : ''
                };
                resolve(JSON.stringify({ list: [vod] }));
            }).catch(function(err) {
                resolve(JSON.stringify({ list: [], msg: err.message }));
            });
        });
    },

    // ----- 播放（直接返回解析后的地址）-----
    play: function(flag, id, flags) {
        // 这里的 id 可能是 play url，但原逻辑是 detail 里已提取，所以我们直接返回 url
        // 但为了兼容，若传入的是完整地址则直接使用
        if (id && id.startsWith('http')) {
            return JSON.stringify({ parse: 0, url: id });
        }
        // 否则假设需要拼接
        var playUrl = this.host + id;
        return JSON.stringify({ parse: 0, url: playUrl });
    },

    // ========================================
    // 辅助方法
    // ========================================

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
