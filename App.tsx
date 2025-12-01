import React, { useState, useCallback, useEffect } from 'react';
import { TopicType, GeneratedHeadline } from './types';
import { generateHeadlines, checkApiKey } from './services/geminiService'; // Keeps filename but logic is Tencent
import { TopicSelector } from './components/TopicSelector';
import { ResultCard } from './components/ResultCard';
import { Sparkles, History, Trash2, Loader2, Zap, GraduationCap, AlertTriangle, Settings, ExternalLink, XCircle } from 'lucide-react';

export default function App() {
  const [selectedTopic, setSelectedTopic] = useState<TopicType>(TopicType.PHONE_CLEANING);
  const [customKeyword, setCustomKeyword] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [creativity, setCreativity] = useState(50); // 0 to 100
  const [maxLength, setMaxLength] = useState(12); // Default 12 chars
  const [loading, setLoading] = useState(false);
  const [headlines, setHeadlines] = useState<GeneratedHeadline[]>([]);
  const [history, setHistory] = useState<GeneratedHeadline[]>([]);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check for keys on mount
    setIsApiKeyMissing(!checkApiKey());
  }, []);

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setHeadlines([]);

    try {
      const results = await generateHeadlines(selectedTopic, customKeyword, creativity, maxLength, referenceText);
      
      const newHeadlines: GeneratedHeadline[] = results.map(text => ({
        id: crypto.randomUUID(),
        text,
        topic: selectedTopic,
        timestamp: Date.now(),
        maxLength: maxLength
      }));

      setHeadlines(newHeadlines);
      setHistory(prev => [...newHeadlines, ...prev].slice(0, 50)); // Keep last 50
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  }, [selectedTopic, customKeyword, creativity, maxLength, referenceText, loading]);

  const handleCopy = (id: string) => {
    // Optional: track copy stats
  };

  const clearHistory = () => {
    if(confirm('确定清空历史记录吗？')) {
      setHistory([]);
    }
  };

  const isFormValid = () => {
    if (loading) return false;
    if (selectedTopic === TopicType.CUSTOM && !customKeyword.trim()) return false;
    if (selectedTopic === TopicType.LEARNING && !referenceText.trim()) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
               <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">爆款推文标题助手</h1>
              <p className="text-xs text-slate-500 font-medium">腾讯混元大模型驱动 · 无需魔法</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Tencent Hunyuan Pro
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Missing Key Warning Banner */}
        {isApiKeyMissing && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                <Settings className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-800 mb-2">未配置腾讯云密钥 (SecretId / SecretKey)</h3>
                <div className="text-sm text-orange-700 space-y-3">
                  <p>您已切换到腾讯云模式，请配置以下环境变量：</p>
                  <ol className="list-decimal list-inside space-y-2 bg-white/50 p-4 rounded-lg border border-orange-100 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">1.</span>
                      <div>进入 Vercel 项目设置 → <strong>Environment Variables</strong></div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">2.</span>
                      <div>
                        添加变量名：<code className="bg-orange-100 px-2 py-0.5 rounded font-mono font-bold select-all">VITE_TENCENT_SECRET_ID</code>
                        <br/>
                        值：您的 SecretId
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">3.</span>
                      <div>
                        添加变量名：<code className="bg-orange-100 px-2 py-0.5 rounded font-mono font-bold select-all">VITE_TENCENT_SECRET_KEY</code>
                        <br/>
                        值：您的 SecretKey
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">4.</span>
                      <div>保存并 <strong>Redeploy</strong> (重新部署)</div>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <section className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ${isApiKeyMissing ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">第一步：选择推文主题</h2>
          <TopicSelector selectedTopic={selectedTopic} onSelect={setSelectedTopic} />

          {/* Reference Text Input */}
          {selectedTopic === TopicType.LEARNING && (
             <div className="mb-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-2">
                   <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                     <GraduationCap className="w-4 h-4 text-pink-500" />
                     仿写样本 (学习素材)
                   </h2>
                   <span className="text-xs text-slate-400">请粘贴您觉得好的标题，每行一个</span>
                </div>
                <textarea
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  placeholder={`例如：\n微信清理不干净？这招更绝\n手机发烫耗电快？一键解决\n...`}
                  className="w-full h-32 px-4 py-3 bg-pink-50/50 border border-pink-100 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all placeholder-slate-400 text-sm"
                />
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
            <div className="md:col-span-1">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                {selectedTopic === TopicType.LEARNING ? "新标题侧重点/关键词" : "第二步：关键词 (可选)"}
              </h2>
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder={
                  selectedTopic === TopicType.CUSTOM ? "输入必须包含的内容..." : 
                  selectedTopic === TopicType.LEARNING ? "想用参考风格写什么内容？" :
                  "例如: 微信占用, 刹车失灵..."
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
             <div className="md:col-span-1">
              <div className="flex justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">标题字数</h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 rounded">
                  {maxLength} 字
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="20"
                step="1"
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>短小精悍 (8)</span>
                <span>信息量大 (20)</span>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="flex justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">创新程度</h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 rounded">
                  {creativity < 30 ? '保守稳重' : creativity > 70 ? '脑洞大开' : '平衡模式'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>常规词汇</span>
                <span>非常规/情绪化</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid() || isApiKeyMissing}
              className={`
                w-full flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-200
                ${!isFormValid() || isApiKeyMissing
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] hover:shadow-indigo-300 active:scale-[0.98]'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  混元大模型思考中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {selectedTopic === TopicType.LEARNING ? "开始仿写生成" : `立即生成标题 (${maxLength}字以内)`}
                </>
              )}
            </button>
            
            {/* Error Banner */}
            {errorMsg && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-800">生成出错</h3>
                  <p className="text-sm text-red-700 whitespace-pre-wrap mt-1 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        {headlines.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                生成结果
              </h2>
              <span className="text-sm text-slate-500">
                已生成 {headlines.length} 个建议
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headlines.map((headline) => (
                <ResultCard key={headline.id} headline={headline} onCopy={handleCopy} />
              ))}
            </div>
          </section>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <section className="pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-600 flex items-center gap-2">
                <History className="w-5 h-5" />
                历史记录
              </h2>
              <button 
                onClick={clearHistory}
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                清空
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70 hover:opacity-100 transition-opacity duration-300">
              {history.slice(headlines.length > 0 ? headlines.length : 0).map((headline) => (
                <ResultCard key={headline.id} headline={headline} onCopy={handleCopy} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}