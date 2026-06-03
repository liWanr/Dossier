'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HistoryRecord } from '@/types/game';

interface ContributionGraphProps {
  history: Record<string, HistoryRecord>;
  today: string; // YYYY-MM-DD from authoritative time + user's tz
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildYearWeeks(year: number): string[][] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay()); // align back to Sunday

  const end = new Date(dec31);
  end.setDate(dec31.getDate() + (6 - dec31.getDay())); // align forward to Saturday

  const weeks: string[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(localDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function cellColor(record: HistoryRecord | undefined, active = false): string {
  if (!record?.easy) return active ? 'bg-stone-200 dark:bg-stone-700' : 'bg-stone-100 dark:bg-stone-800';
  if (record.easy && record.medium && record.hard) return active ? 'bg-emerald-600' : 'bg-emerald-500';
  if (record.easy && record.medium) return active ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700';
  return active ? 'bg-emerald-400' : 'bg-emerald-200 dark:bg-emerald-800';
}

function formatDateChinese(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAY_LABELS = ['', '一', '', '三', '', '五', ''];

export function ContributionGraph({ history, today }: ContributionGraphProps) {
  const year = parseInt(today.slice(0, 4));
  const [selected, setSelected] = useState<string | null>(null);

  const router = useRouter();
  const weeks = buildYearWeeks(year);
  const todayStr = today;
  const yearPrefix = String(year);

  const yearDays = Object.keys(history).filter(d => d.startsWith(yearPrefix)).length;

  const selectedRecord = selected ? history[selected] : undefined;

  return (
    <div>
      {/* Year count header */}
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
        {yearDays > 0
          ? <><span className="font-semibold text-stone-700 dark:text-stone-200">{yearDays}</span> 天完成了推理挑战</>
          : year + ' 年暂无记录'}
      </p>

      <div className="flex gap-6 items-start">
        {/* Graph — fills remaining width */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-[2px] w-full">
            {/* Day-of-week labels — fixed width, no shrink */}
            <div className="flex flex-col gap-[2px] shrink-0 pt-[18px] w-5">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="text-[9px] text-stone-400 dark:text-stone-500 flex items-center justify-end pr-0.5 aspect-square">
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns — each takes equal share of remaining width */}
            {weeks.map((week, wi) => {
              const monthStart = week.find(d => d.endsWith('-01') && d.startsWith(yearPrefix));
              return (
                <div key={wi} className="flex flex-col gap-[2px] flex-1 min-w-0">
                  <div className="h-[18px] text-[10px] text-stone-400 dark:text-stone-500 leading-none overflow-hidden whitespace-nowrap">
                    {monthStart ? MONTHS[parseInt(monthStart.split('-')[1]) - 1] : ''}
                  </div>
                  {week.map(dateStr => {
                    const inYear = dateStr.startsWith(yearPrefix);
                    const isFuture = dateStr > todayStr;
                    const record = history[dateStr];
                    const isSelected = selected === dateStr;

                    if (!inYear) {
                      return <div key={dateStr} className="w-full aspect-square" />;
                    }

                    return (
                      <button
                        key={dateStr}
                        disabled={isFuture}
                        onClick={() => setSelected(isSelected ? null : dateStr)}
                        title={formatDateChinese(dateStr)}
                        className={[
                          'w-full aspect-square rounded-sm transition-all duration-150',
                          isFuture
                            ? 'bg-stone-50 dark:bg-stone-800/50 cursor-default'
                            : [cellColor(record, isSelected), 'cursor-pointer'].join(' '),
                          selected && !isSelected ? 'opacity-60' : '',
                        ].join(' ')}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 text-[10px] text-stone-400 dark:text-stone-500">
            <span className="mr-0.5">少</span>
            <div className="w-3 h-3 rounded-sm bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="ml-0.5">多</span>
          </div>
        </div>

      </div>

      {/* Detail panel */}
      {selected && (
        <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{formatDateChinese(selected)}</p>
            <div className="flex gap-1.5">
              {selectedRecord?.easy && (
                <button
                  onClick={() => router.push(`/?date=${selected.replace(/-/g, '')}&practice=1`)}
                  className="text-xs px-3 py-1.5 rounded-md border border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                  title="不影响今日战绩，可重新解答"
                >
                  练习
                </button>
              )}
              <button
                onClick={() => router.push(`/?date=${selected.replace(/-/g, '')}`)}
                className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                {selectedRecord?.easy ? '前往复盘' : '前往挑战'}
              </button>
            </div>
          </div>
          {!selectedRecord ? (
            <p className="text-stone-400 dark:text-stone-500 text-sm">当日未完成任何挑战</p>
          ) : (
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => {
                const done = !!selectedRecord[d];
                const labels = { easy: '简单', medium: '中等', hard: '困难' };
                return (
                  <div key={d} className={[
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md',
                    done ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500',
                  ].join(' ')}>
                    <span>{done ? '✓' : '·'}</span>
                    <span className="font-medium">{labels[d]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
