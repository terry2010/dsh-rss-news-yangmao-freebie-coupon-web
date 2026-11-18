// 采集源配置：id 需与 api sources 表一致（admin 后台可增改 trusted/enabled）
// filter: 命中任一关键词才收录（标题+摘要）；category 作为初始分类（AI 审核可能改判）
export const SOURCES = [
  {
    id: "jidan",
    name: "小鸡论坛",
    kind: "rss",
    url: "https://www.jidan.net/feed",
    category: "deal",
    filter: /免费|羊毛|优惠|白嫖|抽奖|兑换码|试用|额度|free/i,
    maxItems: 30,
  },
  {
    id: "nodeseek",
    name: "NodeSeek",
    kind: "rss",
    url: "https://www.nodeseek.com/rss.xml",
    category: "vps",
    filter: /免费|羊毛|优惠|白嫖|抽奖|兑换|试用|折扣|码|free|coupon/i,
    maxItems: 30,
  },
  {
    id: "lowendbox",
    name: "LowEndBox",
    kind: "rss",
    url: "https://lowendbox.com/feed/",
    category: "vps",
    filter: null, // 全站都是 deal，不过滤
    maxItems: 20,
  },
  {
    id: "hostloc",
    name: "HostLoc",
    kind: "rss",
    url: "https://hostloc.com/forum.php?mod=rss&fid=45",
    category: "vps",
    filter: /免费|优惠|折扣|试用|free/i,
    maxItems: 20,
  },
  {
    id: "v2ex-deal",
    name: "V2EX 优惠信息",
    kind: "rss",
    url: "https://www.v2ex.com/feed/deals.xml",
    category: "deal",
    filter: null,
    maxItems: 20,
  },
];
