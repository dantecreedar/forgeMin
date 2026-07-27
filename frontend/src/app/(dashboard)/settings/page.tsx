'use client';

import { useState } from 'react';
import { useProfileSettings } from '@/lib/settings-context';
import { motion } from 'framer-motion';
import { Sparkles, Save, Check, RefreshCw, Type, Eye, Palette, Shield, Globe, Mail } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useProfileSettings();
  const lang = settings.language || 'es';
  const t = translations[lang].settings;
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-800"
        >
          <Check size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="text-primary" size={22} />
            {t.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => {
            resetSettings();
            showToast(t.resetDone);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all w-fit"
        >
          <RefreshCw size={14} />
          <span>{t.reset}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Language */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Globe size={18} className="text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">{t.languageTitle}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  updateSettings({ language: 'es' });
                  showToast(t.langChangedEs);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  settings.language === 'es' || !settings.language
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇪🇸</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{t.spanish}</p>
                    <p className="text-[10px] text-muted-foreground">{t.spanishSub}</p>
                  </div>
                </div>
                {(settings.language === 'es' || !settings.language) && <Check size={14} className="text-primary" />}
              </button>

              <button
                onClick={() => {
                  updateSettings({ language: 'en' });
                  showToast('Language changed to English');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  settings.language === 'en'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇺🇸</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{t.english}</p>
                    <p className="text-[10px] text-muted-foreground">{t.englishSub}</p>
                  </div>
                </div>
                {settings.language === 'en' && <Check size={14} className="text-primary" />}
              </button>
            </div>
          </div>

          {/* Section 2: Watermark */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Shield size={18} className="text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">{t.watermarkTitle}</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800">{t.showWatermark}</label>
                <p className="text-[11px] text-muted-foreground">{t.showWatermarkSub}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showWatermark}
                onChange={(e) => {
                  updateSettings({ showWatermark: e.target.checked });
                  showToast(t.watermarkUpdated);
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>

            {settings.showWatermark && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Type size={14} />
                    {t.watermarkText}
                  </label>
                  <input
                    type="text"
                    value={settings.watermarkText}
                    onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ej: SaferSchoolSolutions"
                  />
                  <p className="text-[10px] text-slate-500 italic mt-1">El sufijo "• Confidencial" se inyectará de forma obligatoria al final de la marca de agua.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Eye size={14} /> {t.opacity} ({Math.round(settings.watermarkOpacity * 100)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.4"
                    step="0.01"
                    value={settings.watermarkOpacity}
                    onChange={(e) => updateSettings({ watermarkOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> {t.previewTitle}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {t.previewBadge}
              </span>
            </div>

            {/* Preview Box */}
            <div className="p-4 rounded-2xl relative overflow-hidden transition-all bg-transparent text-slate-800">
              {/* Watermark Overlay */}
              {settings.showWatermark && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-bold text-sm tracking-widest uppercase transform -rotate-12 text-slate-400"
                  style={{ opacity: settings.watermarkOpacity }}
                >
                  {settings.watermarkText} • Confidencial
                </div>
              )}

              {/* Clean Content */}
              <div className="space-y-3 text-xs leading-relaxed">
                <p className="font-semibold text-sm text-slate-900">{t.previewHeading}</p>
                <p>{t.previewText}</p>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{t.previewKeyPoints}</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{t.previewPoint1}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{t.previewPoint2}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{t.previewPoint3}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Static Non-Interactive Action Buttons Preview */}
              <div className="mt-4 flex items-center justify-start gap-2 pointer-events-none select-none opacity-85 cursor-default">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-200/70 text-slate-700 border border-slate-300/60">
                  <Mail size={13} />
                  <span>{translations[lang].dashboard.sendEmail}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-200/70 text-slate-700 border border-slate-300/60">
                  <Save size={13} />
                  <span>{translations[lang].dashboard.saveResponse}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 text-center">{t.previewCaption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
