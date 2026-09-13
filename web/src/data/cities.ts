// 城市数据（拼音首字母 A-Z 分组，供城市选择树使用）
export interface City {
  name: string;
  pinyin: string;
}

export const CITIES: City[] = [
  { name: "鞍山", pinyin: "anshan" }, { name: "安庆", pinyin: "anqing" }, { name: "安阳", pinyin: "anyang" }, { name: "安顺", pinyin: "anshun" },
  { name: "北京", pinyin: "beijing" }, { name: "包头", pinyin: "baotou" }, { name: "蚌埠", pinyin: "bengbu" }, { name: "保定", pinyin: "baoding" }, { name: "北海", pinyin: "beihai" }, { name: "本溪", pinyin: "benxi" },
  { name: "成都", pinyin: "chengdu" }, { name: "重庆", pinyin: "chongqing" }, { name: "长沙", pinyin: "changsha" }, { name: "长春", pinyin: "changchun" }, { name: "常州", pinyin: "changzhou" }, { name: "沧州", pinyin: "cangzhou" }, { name: "常德", pinyin: "changde" }, { name: "滁州", pinyin: "chuzhou" }, { name: "承德", pinyin: "chengde" },
  { name: "大连", pinyin: "dalian" }, { name: "东莞", pinyin: "dongguan" }, { name: "大庆", pinyin: "daqing" }, { name: "大同", pinyin: "datong" }, { name: "丹东", pinyin: "dandong" }, { name: "东营", pinyin: "dongying" }, { name: "德州", pinyin: "dezhou" }, { name: "达州", pinyin: "dazhou" }, { name: "德阳", pinyin: "deyang" },
  { name: "鄂尔多斯", pinyin: "eerduosi" }, { name: "恩施", pinyin: "enshi" }, { name: "鄂州", pinyin: "ezhou" },
  { name: "福州", pinyin: "fuzhou" }, { name: "佛山", pinyin: "foshan" }, { name: "抚顺", pinyin: "fushun" }, { name: "阜阳", pinyin: "fuyang" },
  { name: "广州", pinyin: "guangzhou" }, { name: "贵阳", pinyin: "guiyang" }, { name: "赣州", pinyin: "ganzhou" }, { name: "桂林", pinyin: "guilin" }, { name: "广元", pinyin: "guangyuan" },
  { name: "杭州", pinyin: "hangzhou" }, { name: "哈尔滨", pinyin: "haerbin" }, { name: "海口", pinyin: "haikou" }, { name: "邯郸", pinyin: "handan" }, { name: "呼和浩特", pinyin: "huhehaote" }, { name: "惠州", pinyin: "huizhou" }, { name: "湖州", pinyin: "huzhou" }, { name: "衡阳", pinyin: "hengyang" }, { name: "淮安", pinyin: "huaian" }, { name: "黄石", pinyin: "huangshi" }, { name: "黄冈", pinyin: "huanggang" }, { name: "菏泽", pinyin: "heze" }, { name: "汉中", pinyin: "hanzhong" }, { name: "合肥", pinyin: "hefei" },
  { name: "济南", pinyin: "jinan" }, { name: "吉林", pinyin: "jilin" }, { name: "嘉兴", pinyin: "jiaxing" }, { name: "金华", pinyin: "jinhua" }, { name: "锦州", pinyin: "jinzhou" }, { name: "九江", pinyin: "jiujiang" }, { name: "揭阳", pinyin: "jieyang" }, { name: "江门", pinyin: "jiangmen" }, { name: "佳木斯", pinyin: "jiamusi" }, { name: "济宁", pinyin: "jining" }, { name: "焦作", pinyin: "jiaozuo" }, { name: "晋城", pinyin: "jincheng" }, { name: "景德镇", pinyin: "jingdezhen" }, { name: "荆州", pinyin: "jingzhou" },
  { name: "昆明", pinyin: "kunming" }, { name: "开封", pinyin: "kaifeng" }, { name: "昆山", pinyin: "kunshan" },
  { name: "兰州", pinyin: "lanzhou" }, { name: "拉萨", pinyin: "lasa" }, { name: "洛阳", pinyin: "luoyang" }, { name: "临沂", pinyin: "linyi" }, { name: "柳州", pinyin: "liuzhou" }, { name: "连云港", pinyin: "lianyungang" }, { name: "漯河", pinyin: "luohe" }, { name: "丽江", pinyin: "lijiang" }, { name: "六安", pinyin: "luan" }, { name: "泸州", pinyin: "luzhou" }, { name: "乐山", pinyin: "leshan" }, { name: "廊坊", pinyin: "langfang" }, { name: "聊城", pinyin: "liaocheng" }, { name: "临汾", pinyin: "linfen" }, { name: "吕梁", pinyin: "lvliang" },
  { name: "绵阳", pinyin: "mianyang" }, { name: "马鞍山", pinyin: "maanshan" }, { name: "牡丹江", pinyin: "mudanjiang" }, { name: "茂名", pinyin: "maoming" }, { name: "眉山", pinyin: "meishan" }, { name: "梅州", pinyin: "meizhou" },
  { name: "南京", pinyin: "nanjing" }, { name: "南昌", pinyin: "nanchang" }, { name: "南宁", pinyin: "nanning" }, { name: "南通", pinyin: "nantong" }, { name: "宁波", pinyin: "ningbo" }, { name: "南充", pinyin: "nanchong" }, { name: "南阳", pinyin: "nanyang" }, { name: "宁德", pinyin: "ningde" }, { name: "内江", pinyin: "neijiang" },
  { name: "平顶山", pinyin: "pingdingshan" }, { name: "盘锦", pinyin: "panjin" }, { name: "莆田", pinyin: "putian" }, { name: "攀枝花", pinyin: "panzhihua" }, { name: "萍乡", pinyin: "pingxiang" }, { name: "濮阳", pinyin: "puyang" },
  { name: "青岛", pinyin: "qingdao" }, { name: "泉州", pinyin: "quanzhou" }, { name: "秦皇岛", pinyin: "qinhuangdao" }, { name: "齐齐哈尔", pinyin: "qiqihaer" }, { name: "衢州", pinyin: "quzhou" }, { name: "清远", pinyin: "qingyuan" }, { name: "曲靖", pinyin: "qujing" },
  { name: "日照", pinyin: "rizhao" },
  { name: "上海", pinyin: "shanghai" }, { name: "深圳", pinyin: "shenzhen" }, { name: "苏州", pinyin: "suzhou" }, { name: "沈阳", pinyin: "shenyang" }, { name: "石家庄", pinyin: "shijiazhuang" }, { name: "汕头", pinyin: "shantou" }, { name: "绍兴", pinyin: "shaoxing" }, { name: "三亚", pinyin: "sanya" }, { name: "宿迁", pinyin: "suqian" }, { name: "上饶", pinyin: "shangrao" }, { name: "韶关", pinyin: "shaoguan" }, { name: "十堰", pinyin: "shiyan" }, { name: "四平", pinyin: "siping" }, { name: "绥化", pinyin: "suihua" }, { name: "遂宁", pinyin: "suining" }, { name: "商丘", pinyin: "shangqiu" }, { name: "三明", pinyin: "sanming" }, { name: "松原", pinyin: "songyuan" },
  { name: "天津", pinyin: "tianjin" }, { name: "太原", pinyin: "taiyuan" }, { name: "唐山", pinyin: "tangshan" }, { name: "台州", pinyin: "taizhou" }, { name: "泰安", pinyin: "taian" }, { name: "泰州", pinyin: "taizhous" }, { name: "铜陵", pinyin: "tongling" }, { name: "通辽", pinyin: "tongliao" }, { name: "铁岭", pinyin: "tieling" }, { name: "通化", pinyin: "tonghua" },
  { name: "武汉", pinyin: "wuhan" }, { name: "无锡", pinyin: "wuxi" }, { name: "乌鲁木齐", pinyin: "wulumuqi" }, { name: "温州", pinyin: "wenzhou" }, { name: "芜湖", pinyin: "wuhu" }, { name: "潍坊", pinyin: "weifang" }, { name: "威海", pinyin: "weihai" }, { name: "梧州", pinyin: "wuzhou" }, { name: "渭南", pinyin: "weinan" },
  { name: "西安", pinyin: "xian" }, { name: "厦门", pinyin: "xiamen" }, { name: "徐州", pinyin: "xuzhou" }, { name: "许昌", pinyin: "xuchang" }, { name: "湘潭", pinyin: "xiangtan" }, { name: "襄阳", pinyin: "xiangyang" }, { name: "新乡", pinyin: "xinxiang" }, { name: "信阳", pinyin: "xinyang" }, { name: "邢台", pinyin: "xingtai" }, { name: "咸阳", pinyin: "xianyang" }, { name: "西宁", pinyin: "xining" }, { name: "忻州", pinyin: "xinzhou" }, { name: "宣城", pinyin: "xuancheng" }, { name: "新余", pinyin: "xinyu" },
  { name: "银川", pinyin: "yinchuan" }, { name: "扬州", pinyin: "yangzhou" }, { name: "烟台", pinyin: "yantai" }, { name: "宜昌", pinyin: "yichang" }, { name: "盐城", pinyin: "yancheng" }, { name: "义乌", pinyin: "yiwu" }, { name: "岳阳", pinyin: "yueyang" }, { name: "宜宾", pinyin: "yibin" }, { name: "营口", pinyin: "yingkou" }, { name: "阳江", pinyin: "yangjiang" }, { name: "宜春", pinyin: "yichun" }, { name: "玉林", pinyin: "yulin" }, { name: "运城", pinyin: "yuncheng" }, { name: "延安", pinyin: "yanan" }, { name: "榆林", pinyin: "yulinn" }, { name: "永州", pinyin: "yongzhou" }, { name: "玉溪", pinyin: "yuxi" },
  { name: "郑州", pinyin: "zhengzhou" }, { name: "珠海", pinyin: "zhuhai" }, { name: "中山", pinyin: "zhongshan" }, { name: "淄博", pinyin: "zibo" }, { name: "遵义", pinyin: "zunyi" }, { name: "湛江", pinyin: "zhanjiang" }, { name: "镇江", pinyin: "zhenjiang" }, { name: "漳州", pinyin: "zhangzhou" }, { name: "株洲", pinyin: "zhuzhou" }, { name: "张家口", pinyin: "zhangjiakou" }, { name: "舟山", pinyin: "zhoushan" }, { name: "肇庆", pinyin: "zhaoqing" }, { name: "自贡", pinyin: "zigong" }, { name: "驻马店", pinyin: "zhumadian" }, { name: "张家界", pinyin: "zhangjiajie" }, { name: "周口", pinyin: "zhoukou" }, { name: "资阳", pinyin: "ziyang" },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface CityGroup {
  letter: string;
  cities: City[];
}

export function groupCities(): CityGroup[] {
  return LETTERS.map((letter) => ({
    letter,
    cities: CITIES.filter((c) => c.pinyin[0].toUpperCase() === letter),
  })).filter((g) => g.cities.length > 0);
}

export function searchCities(kw: string): City[] {
  const k = kw.trim().toLowerCase();
  if (!k) return CITIES;
  return CITIES.filter(
    (c) => c.name.includes(kw.trim()) || c.pinyin.startsWith(k) || c.pinyin.includes(k),
  );
}
