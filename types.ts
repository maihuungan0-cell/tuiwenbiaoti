export enum TopicType {
  PHONE_CLEANING = 'PHONE_CLEANING',
  WECHAT_FEATURES = 'WECHAT_FEATURES',
  BATTERY_SAVING = 'BATTERY_SAVING',
  CAR_POLICY = 'CAR_POLICY',
  LEARNING = 'LEARNING',
  CUSTOM = 'CUSTOM'
}

export interface GeneratedHeadline {
  id: string;
  text: string;
  isCopying?: boolean;
  topic: TopicType;
  timestamp: number;
  maxLength?: number;
}

export interface GenerationConfig {
  topic: TopicType;
  customKeyword: string;
  creativityLevel: number; // 0-100 mapped to temperature
  maxLength: number;
  referenceText?: string;
}