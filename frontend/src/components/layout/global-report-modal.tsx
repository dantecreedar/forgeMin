'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, CheckCircle, AlertCircle, RefreshCw, Send, FileText, LayoutDashboard, Target } from 'lucide-react';
import { api } from '@/lib/api';

interface GlobalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectName?: string;
  defaultSummary?: string;
}

export function GlobalReportModal({ isOpen, onClose, defaultProjectName, defaultSummary }: GlobalReportModalProps) {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);

  const [reportType, setReportType] = useState<'project' | 'documents' | 'app'>('project');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('access_token');
      const urlEmail = urlParams.get('email');

      if (urlToken && urlEmail) {
        localStorage.setItem('gmail_access_token', urlToken);
        localStorage.setItem('gmail_email', urlEmail);
        setGmailConnected(true);
        setGmailToken(urlToken);
        setGmailEmail(urlEmail);
      } else {
        const token = localStorage.getItem('gmail_access_token');
        const email = localStorage.getItem('gmail_email');
        if (token && email) {
          setGmailConnected(true);
          setGmailToken(token);
          setGmailEmail(email);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (reportType === 'project') {
      setEmailSubject(`Reporte de Proyecto: ${defaultProjectName || 'ForgeMind'}`);
      setEmailContent(
        `Reporte Ejecutivo del Proyecto ${defaultProjectName || 'ForgeMind'}:\n\n${defaultSummary || 'El proyecto se encuentra actualizado y en desarrollo activo.'}\n\n- Fecha de emisión: ${new Date().toLocaleDateString()}`
      );
    } else if (reportType === 'documents') {
      setEmailSubject(`Reporte de Documentos y Análisis Técnico: ${defaultProjectName || 'ForgeMind'}`);
      setEmailContent(
        `Resumen del Análisis de Especificaciones y Documentación Técnica:\n\n- Proyecto: ${defaultProjectName || 'ForgeMind'}\n- Estado: Documentación vinculada y procesada.\n- Notas: Las especificaciones y archivos adjuntos han sido analizados correctamente por la plataforma.`
      );
    } else {
      setEmailSubject(`Reporte Consolidado del Estado Global de la Aplicación (ForgeMind)`);
      setEmailContent(
        `Visión General y Estado de la Aplicación ForgeMind:\n\n- Estado General: Sistema Operativo 100%\n- Integración GitHub: Activa\n- Inteligencia Artificial: Gemini Engine Sincronizado\n- Avances: Todos los módulos se encuentran funcionando correctamente.`
      );
    }
  }, [reportType, defaultProjectName, defaultSummary]);

  const connectGmail = async () => {
    try {
      const res = await api.gmail.getAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert('Error al iniciar vinculación con Google: ' + (err.message || 'Verifica GOOGLE_CLIENT_ID en backend/.env'));
    }
  };

  const handleSendReportEmail = async () => {
    if (!emailTo.trim()) {
      setEmailErrorMsg('Por favor ingresa un correo destinatario.');
      return;
    }
    if (!gmailToken) {
      setEmailErrorMsg('Debes vincular la app a Gmail para despachar correos.');
      return;
    }

    setSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.gmail.sendReport({
        accessToken: gmailToken,
        to: emailTo.trim(),
        subject: emailSubject.trim() || 'Reporte de Estado - ForgeMind',
        content: emailContent,
        projectName: defaultProjectName || 'ForgeMind',
      });

      if (res.success) {
        setEmailSuccessMsg('¡Reporte enviado exitosamente mediante Gmail!');
        setTimeout(() => onClose(), 2000);
      }
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Error al despachar el correo.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-xl w-full space-y-4 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Enviar Reporte Personalizado</h3>
                <p className="text-[11px] text-slate-500">Despacha informes ejecutivos y de estado por Gmail</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <X size={18} />
            </button>
          </div>

          {/* Gmail Connection Banner */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${gmailConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-800">
                {gmailConnected ? `Conectado como: ${gmailEmail}` : 'Gmail no vinculado en la app'}
              </span>
            </div>
            {!gmailConnected ? (
              <button
                onClick={connectGmail}
                className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
              >
                <Mail size={12} /> Vincular Gmail
              </button>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Listo</span>
            )}
          </div>

          {emailSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <span>{emailSuccessMsg}</span>
            </div>
          )}

          {emailErrorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0" />
              <span>{emailErrorMsg}</span>
            </div>
          )}

          {/* Report Type Selector Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Tipo de Reporte a Enviar:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReportType('project')}
                className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                  reportType === 'project'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Target size={14} className={reportType === 'project' ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-xs">Estado Proyecto</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('documents')}
                className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                  reportType === 'documents'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={14} className={reportType === 'documents' ? 'text-purple-600' : 'text-slate-400'} />
                <span className="text-xs">Documentos</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('app')}
                className={`p-2.5 border rounded-xl text-left transition-all flex items-center gap-2 ${
                  reportType === 'app'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard size={14} className={reportType === 'app' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs">Estado App</span>
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Destinatario (Email):
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="cliente@empresa.com, equipo@dev.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Asunto:
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contenido / Notas del Reporte:
              </label>
              <textarea
                rows={5}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-500/20 font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendReportEmail}
              disabled={sendingEmail || !gmailConnected}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              {sendingEmail ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sendingEmail ? 'Enviando...' : 'Enviar Reporte por Gmail'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
