'use client';

import { useSettingsStore, type ColorMode } from '@/lib/store/settingsStore';
import { MatrixCell } from '@/components/game/LogicMatrix/MatrixCell';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { colorMode, highContrast, setColorMode, setHighContrast } = useSettingsStore();

  if (!open) return null;

  const modes: { value: ColorMode; label: string; desc: string }[] = [
    { value: 'default',    label: '默认',     desc: '红 ✕ / 绿 ✓ —— 通用配色' },
    { value: 'colorblind', label: '色盲友好', desc: '橙 ✕ / 蓝 ✓ —— 红绿色盲安全调色板，附形状区分' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-amber-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-50">显示设置</h2>
            <p className="text-amber-200 text-xs mt-0.5">色彩与对比度</p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white text-2xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Color mode */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">配色方案</h3>
            <div className="space-y-2">
              {modes.map(m => (
                <label
                  key={m.value}
                  className={[
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    colorMode === m.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-stone-200 hover:bg-stone-50',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="colorMode"
                    value={m.value}
                    checked={colorMode === m.value}
                    onChange={() => setColorMode(m.value)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stone-700">{m.label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* High contrast */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">对比度</h3>
            <label className={[
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              highContrast ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:bg-stone-50',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="accent-amber-600"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-stone-700">高对比度模式</div>
                <div className="text-xs text-stone-500 mt-0.5">加粗描边、加大图标、加深底色</div>
              </div>
            </label>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">预览</h3>
            <div className="flex gap-3 items-center justify-center bg-stone-50 rounded-lg py-4">
              <div className="text-center">
                <MatrixCell state="excluded" isManual onClick={() => {}} size={44} />
                <div className="text-[10px] text-stone-500 mt-1">排除</div>
              </div>
              <div className="text-center">
                <MatrixCell state="confirmed" onClick={() => {}} size={44} />
                <div className="text-[10px] text-stone-500 mt-1">确认</div>
              </div>
              <div className="text-center">
                <MatrixCell state="unknown" onClick={() => {}} size={44} />
                <div className="text-[10px] text-stone-500 mt-1">未知</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-amber-800 hover:bg-amber-900 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
