import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { GeneratedHeadline } from '../types';

interface ResultCardProps {
  headline: GeneratedHeadline;
  onCopy: (id: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ headline, onCopy }) => {
  const [justCopied, setJustCopied] = useState(false);

  // Simple character count (treating mostly Chinese/wide chars)
  const length = headline.text.replace(/\s+/g, '').length;
  // Use the maxLength stored with the headline, default to 12 if from old history
  const limit = headline.maxLength || 12;
  const isTooLong = length > limit;

  const handleCopy = () => {
    navigator.clipboard.writeText(headline.text);
    onCopy(headline.id);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  return (
    <div 
      className={`
        group relative p-5 bg-white rounded-xl border transition-all duration-300
        hover:shadow-lg flex items-center justify-between
        ${isTooLong ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100 hover:border-indigo-100'}
      `}
    >
      <div className="flex-1 pr-4">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight">
          {headline.text}
        </h3>
        <div className="flex items-center mt-2 gap-2">
           <span className={`text-xs font-medium px-2 py-0.5 rounded ${isTooLong ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
            {length} 字
           </span>
           {isTooLong && (
             <span className="flex items-center text-xs text-orange-600">
               <AlertCircle className="w-3 h-3 mr-1" /> 建议精简 (限{limit}字)
             </span>
           )}
        </div>
      </div>
      
      <button
        onClick={handleCopy}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
          ${justCopied 
            ? 'bg-green-500 text-white scale-110 shadow-green-200' 
            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200'
          }
          shadow-sm
        `}
        title="复制标题"
      >
        {justCopied ? <Check className="w-6 h-6" /> : <Copy className="w-5 h-5" />}
      </button>
    </div>
  );
};