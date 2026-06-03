'use client';

import { useEffect, useState } from 'react';
import type { HistoryRecord } from '@/types/game';
import { getAllHistory, subscribeToSync } from '@/lib/db/storage';
import { AppHeader } from '@/components/AppHeader';
import { ContributionGraph } from '@/components/history/ContributionGraph';
import { TutorialModal } from '@/components/TutorialModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettingsStore } from '@/lib/store/settingsStore';

function getBrowserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

export default function HistoryPage() {
  const [history, setHistory] = useState<Record<string, HistoryRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const hydrateSettings = useSettingsStore(s => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    getAllHistory().then(h => {
      setHistory(h);
      setLoaded(true);
    });
    const tz = getBrowserTz();
    fetch(`/api/time?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(d => { if (typeof d.today === 'string') setToday(d.today); })
      .catch(console.error);

    // Cross-tab: refresh contribution graph when another tab logs a completion
    const unsub = subscribeToSync((msg) => {
      if (msg.kind === 'history' || msg.kind === 'gameState') {
        getAllHistory().then(setHistory).catch(console.error);
      }
    });
    return unsub;
  }, [hydrateSettings]);

  const participated = Object.values(history).filter(r => r.easy).length;
  const fullDays = Object.values(history).filter(r => r.easy && r.medium && r.hard).length;
  const rate = participated > 0 ? Math.round((fullDays / participated) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col">
      <TutorialModal forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AppHeader activePage="history" onShowTutorial={() => setShowTutorial(true)} onShowSettings={() => setShowSettings(true)} />

      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '参与天数', value: participated, unit: '天' },
            { label: '全部完成', value: fullDays, unit: '天' },
            { label: '全完成率', value: rate, unit: '%' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-stone-900 rounded-xl px-4 py-4 text-center shadow-sm ring-1 ring-stone-200 dark:ring-stone-700">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stat.value}<span className="text-sm text-stone-400 dark:text-stone-500 ml-1">{stat.unit}</span>
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Contribution graph */}
        <div className="bg-white dark:bg-stone-900 rounded-xl px-6 py-5 shadow-sm ring-1 ring-stone-200 dark:ring-stone-700">
          {loaded && today ? (
            <ContributionGraph history={history} today={today} />
          ) : (
            <div className="text-stone-400 text-sm animate-pulse py-10 text-center">加载中…</div>
          )}
        </div>
      </div>
    </div>
  );
}
