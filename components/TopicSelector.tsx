import React from 'react';
import { TopicType } from '../types';
import { Smartphone, MessageCircle, Battery, Car, PenTool, GraduationCap } from 'lucide-react';

interface TopicSelectorProps {
  selectedTopic: TopicType;
  onSelect: (topic: TopicType) => void;
}

const topics = [
  { id: TopicType.PHONE_CLEANING, label: '手机清理', icon: Smartphone, color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { id: TopicType.WECHAT_FEATURES, label: '微信功能', icon: MessageCircle, color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
  { id: TopicType.BATTERY_SAVING, label: '手机省电', icon: Battery, color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
  { id: TopicType.CAR_POLICY, label: '车辆政策', icon: Car, color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
  { id: TopicType.LEARNING, label: '爆文仿写', icon: GraduationCap, color: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200' },
  { id: TopicType.CUSTOM, label: '自定义', icon: PenTool, color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
];

export const TopicSelector: React.FC<TopicSelectorProps> = ({ selectedTopic, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      {topics.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedTopic === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
              ${isSelected ? 'border-slate-800 shadow-md transform -translate-y-1' : 'border-transparent opacity-80 hover:opacity-100'}
              ${item.color}
            `}
          >
            <Icon className="w-6 h-6 mb-2" />
            <span className="font-bold text-sm">{item.label}</span>
            {isSelected && (
              <div className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};