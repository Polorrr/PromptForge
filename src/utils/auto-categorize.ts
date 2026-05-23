import { DEFAULT_CATEGORIES } from '@/constants/categories';

const KEYWORDS: Record<string, string[]> = {
  writing: ['写', '文章', '故事', '小说', '文案', '作文', '邮件', '信', '报告', '总结', '翻译', '改写', '润色', '续写', '缩写', '扩写', '摘要', 'write', 'story', 'email', 'article', 'essay', 'letter', 'report', 'summary', 'translate', 'rewrite'],
  coding: ['代码', '编程', '函数', 'bug', '调试', '算法', '程序', '开发', '前端', '后端', '接口', 'api', '数据库', 'sql', 'code', 'function', 'debug', 'algorithm', 'program', 'develop', 'frontend', 'backend', 'database', 'python', 'javascript', 'typescript', 'java', 'css', 'html'],
  marketing: ['营销', '推广', '广告', '品牌', '运营', '增长', '转化', '投放', 'seo', 'sem', 'social', 'marketing', 'campaign', 'promotion', 'brand', 'audience'],
  analysis: ['分析', '数据', '报表', '统计', '趋势', '对比', '评估', '调研', '预测', 'analysis', 'data', 'report', 'statistics', 'trend', 'compare', 'evaluate', 'research', 'forecast'],
  creative: ['创意', '设计', 'ui', 'ux', '画', '海报', 'logo', '配色', '排版', 'creative', 'design', 'illustration', 'art', 'graphic', 'visual'],
  education: ['教学', '课程', '学习', '教育', '培训', '考试', '知识', '讲解', 'teach', 'course', 'learn', 'education', 'training', 'exam', 'lesson', 'tutor'],
  business: ['商业', '项目', '管理', '战略', '融资', '财务', '市场', '竞争', 'business', 'project', 'management', 'strategy', 'finance', 'market', 'competitor', 'plan'],
};

export function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [catId, keywords] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[catId] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'other';
}

export function getCategoryName(categoryId: string): string {
  const cat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.nameZh || cat?.name || categoryId;
}

export function getCategoryIcon(categoryId: string): string {
  const cat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.icon || '📁';
}
