package model

// 字典与枚举选项：前后端共享，由 GET /api/dicts 下发。

type Option struct {
	Value int    `json:"value"`
	Label string `json:"label"`
}

type SalaryBucket struct {
	Label string `json:"label"`
	Min   int    `json:"min"` // 单位 k，含
	Max   int    `json:"max"` // 不含；0 表示无上限
}

type Dim struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

var (
	EducationOptions = []Option{
		// 值保持稳定（1=无要求是发布默认值，可被精确筛选）；切片顺序即展示顺序
		{1, "无要求"}, {6, "高中"}, {2, "大专"}, {3, "本科"}, {4, "硕士"}, {5, "博士"},
	}
	ExperienceOptions = []Option{
		{1, "不限"}, {2, "应届"}, {3, "1-3年"}, {4, "3-5年"}, {5, "5-10年"}, {6, "10年以上"},
	}
	IndustryOptions = []string{
		"互联网", "电子商务", "游戏", "软件", "金融", "教育", "医疗健康", "智能制造",
		"房地产", "汽车", "消费品", "物流运输", "文化传媒", "能源化工", "其他",
	}
	SizeOptions = []string{
		"0-20人", "20-99人", "100-499人", "500-999人", "1000-9999人", "10000人以上",
	}
	FundingOptions = []string{
		"未融资", "不需要融资", "天使轮", "A轮", "B轮", "C轮", "D轮及以上", "已上市",
	}
	SalaryBuckets = []SalaryBucket{
		{Label: "3k以下", Min: 0, Max: 3},
		{Label: "3-5k", Min: 3, Max: 5},
		{Label: "5-10k", Min: 5, Max: 10},
		{Label: "10-15k", Min: 10, Max: 15},
		{Label: "15-20k", Min: 15, Max: 20},
		{Label: "20-30k", Min: 20, Max: 30},
		{Label: "30k以上", Min: 30, Max: 0},
	}
	// 评价评分点（重要评分维度）。
	ReviewDims = []Dim{
		{Key: "atmosphere", Label: "氛围环境"},
		{Key: "welfare", Label: "薪酬福利"},
		{Key: "intensity", Label: "工作强度"},
		{Key: "growth", Label: "成长晋升"},
	}
	RestTypeOptions = []Option{
		{RestTypeDouble, "双休"}, {RestTypeSingle, "单休"}, {RestTypeUnset, "不定"},
	}
	// 点评主体列表排序。
	CompanySorts = []string{"rating_desc", "rating_asc", "count_desc", "count_asc", "new"}
)

func ValidDictValue(opts []Option, v int) bool {
	for _, o := range opts {
		if o.Value == v {
			return true
		}
	}
	return false
}

func ValidDictString(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
