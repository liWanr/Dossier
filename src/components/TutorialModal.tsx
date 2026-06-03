'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tutorial-seen-v1';

interface TutorialModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function TutorialModal({ forceOpen, onClose }: TutorialModalProps) {
  const [seenAuto, setSeenAuto] = useState(true);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setSeenAuto(false);
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

  const open = forceOpen || !seenAuto;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setSeenAuto(true);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-800 px-6 py-4">
          <h2 className="text-lg font-bold text-amber-50">欢迎来到侦探事务所</h2>
          <p className="text-amber-200 text-xs mt-0.5">每天一道逻辑推理谜题</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Click mechanics */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">操作方式</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '✕', label: '点一次',   desc: '排除', color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900' },
                { icon: '✓', label: '再点一次', desc: '确认', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' },
                { icon: '○', label: '再点一次', desc: '清除', color: 'text-stone-500 dark:text-stone-300', bg: 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700' },
              ].map(({ icon, label, desc, color, bg }) => (
                <div key={label} className={`rounded-lg border px-3 py-3 text-center ${bg}`}>
                  <div className={`text-xl font-bold ${color}`}>{icon}</div>
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-200 mt-1">{label}</div>
                  <div className="text-[11px] text-stone-400 dark:text-stone-500">{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
              同一个格子反复点击会循环切换：<span className="text-red-500 dark:text-red-400 font-semibold">✕</span> → <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓</span> → <span className="text-stone-500 dark:text-stone-300 font-semibold">○</span>（无标记）→ <span className="text-red-500 dark:text-red-400 font-semibold">✕</span> …
            </p>
          </div>

          {/* Rules */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">游戏规则</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-stone-600 dark:text-stone-300">
              <li>根据右侧线索，推断左侧表格中每对元素的关系</li>
              <li>每行每列有且只有一个<span className="font-semibold text-emerald-600">确认</span>关系</li>
              <li>线索面板中的词语可点击，高亮表格中的相关行列</li>
            </ul>
          </div>

          {/* Time period definitions — pinned to avoid colloquial mismatches */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">时段定义</h3>
            <div className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2.5 space-y-1">
              <div>
                <span className="inline-block w-12 font-semibold text-amber-700">上午</span>
                <span className="text-stone-500 dark:text-stone-400">06:00 – 11:59</span>
                <span className="text-stone-400 dark:text-stone-500 ml-2">（含 9 点、11 点）</span>
              </div>
              <div>
                <span className="inline-block w-12 font-semibold text-amber-700">下午</span>
                <span className="text-stone-500 dark:text-stone-400">12:00 – 17:59</span>
                <span className="text-stone-400 dark:text-stone-500 ml-2">（含正午 12 点、下午 2 / 4 点）</span>
              </div>
              <div>
                <span className="inline-block w-12 font-semibold text-amber-700">晚上</span>
                <span className="text-stone-500 dark:text-stone-400">18:00 – 23:59</span>
                <span className="text-stone-400 dark:text-stone-500 ml-2">（含傍晚 6 点、晚 8 / 10 点）</span>
              </div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 pt-1.5 border-t border-stone-200 dark:border-stone-700 space-y-0.5">
                <div>* 系统按上述区间归类，不使用「深夜 / 凌晨」等口语词</div>
                <div>* <span className="font-semibold text-amber-700">正午 12 点归入"下午"</span>，<span className="font-semibold text-amber-700">傍晚 6 点归入"晚上"</span></div>
              </div>
            </div>
          </div>

          {/* Shortcuts hint */}
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2.5 text-[11px] text-stone-500 dark:text-stone-400 flex gap-4 flex-wrap">
            {isMac ? (
              <>
                <span><kbd className="bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-1 py-0.5 font-mono text-[10px]">⌘+Z</kbd> 撤回</span>
                <span><kbd className="bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-1 py-0.5 font-mono text-[10px]">⌘+⇧+Z</kbd> 重做</span>
              </>
            ) : (
              <>
                <span><kbd className="bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-1 py-0.5 font-mono text-[10px]">Ctrl+Z</kbd> 撤回</span>
                <span><kbd className="bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-1 py-0.5 font-mono text-[10px]">Ctrl+Y</kbd> 重做</span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={dismiss}
            className="w-full bg-amber-800 hover:bg-amber-900 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            开始推理
          </button>
        </div>
      </div>
    </div>
  );
}
