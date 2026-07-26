'use client';

import { useState } from 'react';
import { useProfileSettings, MessageDesign } from '@/lib/settings-context';
import { motion } from 'framer-motion';
import { Sparkles, Save, Check, RefreshCw, Type, Eye, Palette, Shield } from 'lucide-react';
import { SendEmailDropdown } from '@/components/chat/send-email-dropdown';

const themes: Array<{
  id: MessageDesign;
  name: string;
  badge: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  accentClass: string;
  description: string;
}> = [
  {
    id: 'slate',
    name: 'Sleek Slate (Predeterminado)',
    badge: 'Profesional',
    bgClass: 'bg-white',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-200 shadow-xs',
    accentClass: 'text-amber-500',
    description: 'Estilo limpio, minimalista e ideal para lectura ejecutiva.',
  },
  {
    id: 'classic',
    name: 'Classic Dark',
    badge: 'Oscuro Premium',
    bgClass: 'bg-slate-900',
    textClass: 'text-slate-100',
    borderClass: 'border-slate-800 shadow-lg',
    accentClass: 'text-sky-400',
    description: 'Fondo oscuro de alta definición enfocado en código e informes.',
  },
  {
    id: 'emerald',
    name: 'Emerald Glass',
    badge: 'Moderno',
    bgClass: 'bg-emerald-950/90 backdrop-blur-md',
    textClass: 'text-emerald-50',
    borderClass: 'border-emerald-800/60 shadow-md',
    accentClass: 'text-emerald-400',
    description: 'Tonos esmeralda elegantes con acabado sutil y contraste alto.',
  },
  {
    id: 'violet',
    name: 'Violet Neon',
    badge: 'Vibrante',
    bgClass: 'bg-indigo-950',
    textClass: 'text-indigo-100',
    borderClass: 'border-indigo-800/80 shadow-indigo-900/30 shadow-lg',
    accentClass: 'text-pink-400',
    description: 'Estilo vanguardista con toques neón para máxima visibilidad.',
  },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useProfileSettings();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const activeTheme = themes.find((t) => t.id === settings.messageDesign) || themes[0];

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
            Configuración de Marca de Agua y Estilo
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Personaliza el sello sutil de marca de agua y los temas visuales de tus respuestas de inteligencia.
          </p>
        </div>
        <button
          onClick={() => {
            resetSettings();
            showToast('Valores restablecidos por defecto');
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all w-fit"
        >
          <RefreshCw size={14} />
          <span>Restablecer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Marca de Agua */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Shield size={18} className="text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">Marca de Agua (Watermark)</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800">Mostrar marca de agua</label>
                <p className="text-[11px] text-muted-foreground">Muestra un sello sutil de autenticidad en los informes y mensajes.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showWatermark}
                onChange={(e) => {
                  updateSettings({ showWatermark: e.target.checked });
                  showToast('Marca de agua actualizada');
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>

            {settings.showWatermark && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Type size={14} />
                    Texto de la marca de agua
                  </label>
                  <input
                    type="text"
                    value={settings.watermarkText}
                    onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ej: ForgeMind • Confidencial"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Eye size={14} /> Opacidad ({Math.round(settings.watermarkOpacity * 100)}%)
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

          {/* Section 2: Diseño del Mensaje */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Palette size={18} className="text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">Diseño y Tema de Respuestas</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme) => {
                const isSelected = settings.messageDesign === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      updateSettings({ messageDesign: theme.id });
                      showToast(`Tema cambiado a ${theme.name}`);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">{theme.name}</span>
                        {isSelected && <Check size={14} className="text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {theme.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-slate-700 w-fit">
                      {theme.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Vista Previa en Tiempo Real
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                Sin símbolos ### ***
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
                  {settings.watermarkText}
                </div>
              )}

              {/* Clean Content */}
              <div className="space-y-3 text-xs leading-relaxed">
                <p className="font-semibold text-sm text-slate-900">Resumen de Análisis Técnico</p>
                <p>
                  El sistema ha evaluado el documento y determinó que la infraestructura de seguridad es robusta y escalable.
                </p>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">Puntos clave identificados:</p>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>Integración completa con servicios en la nube.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>Segmentación de funciones por rol de usuario.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>Optimización de flujos de trabajo sin ruido de formato.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons inside Response */}
              <div className="mt-4 flex items-center justify-start gap-2">
                <SendEmailDropdown
                  defaultEmail="usuario@empresa.com"
                  onSend={(targetEmail) => showToast(`Respuesta enviada a ${targetEmail}`)}
                />
                <button
                  onClick={() => showToast('Respuesta guardada en la sección Guardados')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-200/70 hover:bg-slate-200 text-slate-700 transition-all"
                >
                  <Save size={12} />
                  <span>Guardar Respuesta</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Así se visualizarán las respuestas en el panel de inteligencia y chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
