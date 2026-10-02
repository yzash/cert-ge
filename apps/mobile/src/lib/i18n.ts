import type { Lang } from '@mozart/schema';
import { useApp } from '@/store/app';

const dict = {
  home: { en: 'Home', ms: 'Utama', zh: '主页', ta: 'முகப்பு' },
  tasks: { en: 'Tasks', ms: 'Tugas', zh: '任务', ta: 'பணிகள்' },
  ask: { en: 'Ask', ms: 'Tanya', zh: '提问', ta: 'கேள்' },
  tour: { en: 'Tour', ms: 'Rondaan', zh: '巡逻', ta: 'சுற்று' },
  me: { en: 'Me', ms: 'Saya', zh: '我', ta: 'நான்' },
  team: { en: 'Team', ms: 'Pasukan', zh: '团队', ta: 'அணி' },
  nextTasks: { en: 'Next up', ms: 'Seterusnya', zh: '下一步', ta: 'அடுத்து' },
  briefing: { en: 'Tonight’s briefing', ms: 'Taklimat malam ini', zh: '今晚简报', ta: 'இன்றிரவு விளக்கம்' },
  acknowledge: { en: 'Acknowledge', ms: 'Akui', zh: '确认', ta: 'ஒப்புக்கொள்' },
  openAlarms: { en: 'Open alarms', ms: 'Penggera terbuka', zh: '未处理警报', ta: 'திறந்த அலாரங்கள்' },
  holdToReport: { en: 'Hold to report', ms: 'Tekan untuk lapor', zh: '按住报告', ta: 'அறிவிக்க அழுத்து' },
  askPlaceholder: { en: 'Ask about SOPs, assets, site rules…', ms: 'Tanya tentang SOP, aset, peraturan…', zh: '询问SOP、设备、现场规定…', ta: 'SOP, சொத்துகள் பற்றி கேளுங்கள்…' },
  verify: { en: 'Verify', ms: 'Sahkan', zh: '核查', ta: 'சரிபார்' },
  friction: { en: 'Flag a problem', ms: 'Lapor masalah', zh: '反馈问题', ta: 'சிக்கல்' },
  handover: { en: 'Handover', ms: 'Serah tugas', zh: '交接班', ta: 'ஒப்படைப்பு' },
  offline: { en: 'Offline', ms: 'Luar talian', zh: '离线', ta: 'ஆஃப்லைன்' },
  online: { en: 'Online', ms: 'Dalam talian', zh: '在线', ta: 'ஆன்லைன்' },
} satisfies Record<string, Record<Lang, string>>;

export type I18nKey = keyof typeof dict;

export function useT() {
  const lang = useApp((s) => s.settings.lang);
  return (k: I18nKey) => dict[k][lang] ?? dict[k].en;
}

export const LANG_LABEL: Record<Lang, string> = { en: 'English', ms: 'Bahasa Melayu', zh: '中文', ta: 'தமிழ்' };
