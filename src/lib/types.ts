export type TagKind = "gain" | "drain";
export type Outcome = "better" | "same" | "worse";
export type Points = 1 | 2 | 3;
export type DryWet = "dry" | "damp";
export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  kind: TagKind;
  points: Points;
  favorite: boolean;
  order: number;
  archived: boolean;
}

export interface EventEntry {
  tagId: string;
  points: Points;
  outcome: Outcome | null;
}

export interface Moment {
  ts: number;
  energy: number;
}

/** 每天一条记录。所有「未记录」一律为 null,统计时排除,不当作 0 或默认值。 */
export interface DayRecord {
  date: string;
  /** 已确认保存的照顾事件，不随草稿或负面反馈变化。 */
  savedCareTags?: string[];
  energy: number | null;
  mood: number | null;
  stress: number | null;
  events: EventEntry[];
  sleepHours: number | null;
  sleepQuality: number | null;
  exercise: "yes" | "no" | null;
  exerciseLevel: 1 | 2 | 3 | null;
  diet: string[] | null;
  coldHot: number | null;
  /** null = 未记录;空数组 = 记录了「都不明显」 */
  dryWet: DryWet[] | null;
  stomach: string | null;
  /** 生理周期阶段,null = 未记录 */
  cycle: CyclePhase | null;
  bodyTags: string[] | null;
  note: string | null;
  moments: Moment[];
  savedAt: number | null;
  updatedAt: number | null;
  demo: boolean;
}

export type Records = Record<string, DayRecord>;

export interface Settings {
  key: "main";
  plantMode?: "auto" | "day" | "night";
  plantMotion?: "system" | "off";
  plantDayStart?: number;
  plantDayEnd?: number;
  plentyMin: number;
  overdrawnMax: number;
  lowEnergyMax: number;
  dietTags: string[];
  bodyTags: string[];
  demoOffered: boolean;
  installHintDismissed: boolean;
  lastBackupAt: number | null;
}

export interface AppData {
  records: Records;
  tags: Tag[];
  tagMap: Record<string, Tag>;
  settings: Settings;
}

export interface BackupFile {
  app: "energy-ledger";
  version: 1;
  exportedAt: string;
  days: DayRecord[];
  tags: Tag[];
  settings: Settings;
}
