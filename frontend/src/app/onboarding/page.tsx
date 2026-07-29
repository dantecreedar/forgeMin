'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, AppMode } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { DeerIcon } from '@/components/ui/deer-icon';
import {
  Mail, Code2, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, ArrowLeft,
  Lock, Globe, HardDrive, Key, RefreshCw, AlertCircle, Check, Users
} from 'lucide-react';

export default function OnboardingWizardPage() {
  const { user, loginWithGoogle, loginWithGithub, setAppMode } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<AppMode>('founder');
  
  // Integrations state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');
      const roleParam = urlParams.get('role') as AppMode | null;

      if (stepParam) setCurrentStep(parseInt(stepParam, 10));
      if (roleParam) setSelectedRole(roleParam);

      const storedGmail = localStorage.getItem('gmail_access_token') || localStorage.getItem('google_token');
      if (storedGmail) setGmailConnected(true);

      const storedGithub = localStorage.getItem('github_token');
      if (storedGithub) setGithubConnected(true);

      const storedLinkedin = localStorage.getItem('linkedin_connected');
      if (storedLinkedin === 'true') setLinkedinConnected(true);

      const storedDrive = localStorage.getItem('google_token');
      if (storedDrive) setDriveConnected(true);

      const savedEmail = localStorage.getItem('gmail_email') || user?.email || '';
      setUserEmail(savedEmail);
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleConnectGmail = async () => {
    try {
      await loginWithGoogle();
      setGmailConnected(true);
      if (typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('gmail_email');
        if (storedEmail) setUserEmail(storedEmail);
      }
    } catch (e) {
      console.error('Error connecting Gmail:', e);
    }
  };

  const handleConnectGithub = async () => {
    try {
      await loginWithGithub();
      setGithubConnected(true);
    } catch (e) {
      console.error('Error connecting GitHub:', e);
    }
  };

  const handleConnectLinkedin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('linkedin_connected', 'true');
      setLinkedinConnected(true);
    }
  };

  const handleFinishOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forgemind_app_mode', selectedRole);
      localStorage.setItem('has_completed_onboarding', 'true');
    }
    if (selectedRole === 'founder') {
      router.push('/dashboard/leads');
    } else {
      router.push('/dashboard');
    }
  };

  const steps = [
    { num: 1, title: 'Cuenta' },
    { num: 2, title: 'Gmail' },
    { num: 3, title: 'Perfil' },
    { num: 4, title: 'Servicios' },
    { num: 5, title: 'Listo' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Wizard Container */}
      <div className="w-full max-w-2xl relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10 mb-1">
            <DeerIcon size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Configuración Inicial de ForgeMind
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Confirma tus servicios y ajusta tu experiencia según tu rol
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between relative">
            {steps.map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="flex flex-col items-center relative z-10 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 scale-105'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isDone ? <Check size={16} /> : step.num}
                  </div>
                  <span className={`text-[11px] font-medium mt-1.5 ${isCurrent ? 'text-blue-400 font-semibold' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card Content */}
        <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Confirmación de Cuenta de Usuario */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Mail className="text-blue-400" size={18} />
                    Paso 1: Confirmar Cuenta de Inicio de Sesión
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verifica tus datos de acceso antes de habilitar los servicios conectados.
                  </p>
                </div>

                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Usuario Autenticado:</span>
                    <span className="font-semibold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      {userEmail || user?.email || 'usuario@forgemind.app'}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Tu sesión se encuentra activa de forma segura. Presiona siguiente para confirmar tu servicio de Gmail.</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Confirmación de Servicio Gmail */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Mail className="text-blue-400" size={18} />
                    Paso 2: Confirmar Servicio de Gmail
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Confirma tu cuenta de Google/Gmail para permitir el despacho de reportes por correo e integración con Drive.
                  </p>
                </div>

                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <Mail size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Servicio de Gmail</h3>
                        <p className="text-xs text-slate-400">Envío de correos y generación de reportes</p>
                      </div>
                    </div>

                    {gmailConnected ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Check size={14} /> Conectado
                      </span>
                    ) : (
                      <button
                        onClick={handleConnectGmail}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-md shadow-blue-600/20"
                      >
                        Vincular Gmail
                      </button>
                    )}
                  </div>

                  {gmailConnected && userEmail && (
                    <div className="text-xs text-slate-300 bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Cuenta de envío: {userEmail}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Selección de Perfil / Rol */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="text-indigo-400" size={18} />
                    Paso 3: Selección de Perfil / Rol
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Selecciona tu perfil principal. La plataforma adaptará las herramientas requeridas para ti.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Desarrollador */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('dev')}
                    className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
                      selectedRole === 'dev'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Code2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Desarrollador</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Repositorios, Commits, Pull Requests y Arquitectura.
                      </p>
                    </div>
                  </button>

                  {/* Gestor */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('management')}
                    className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
                      selectedRole === 'management'
                        ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Gestor</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Prospección de Leads, LinkedIn e Inteligencia Comercial.
                      </p>
                    </div>
                  </button>

                  {/* Fundador */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('founder')}
                    className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
                      selectedRole === 'founder'
                        ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20 shadow-lg'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Fundador</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Acceso 360° a Desarrollo, Ventas y Documentación.
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Confirmación Específica de Servicios según el Rol */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="text-purple-400" size={18} />
                    Paso 4: Confirmación de Servicios para {selectedRole === 'dev' ? 'Desarrollador' : selectedRole === 'management' ? 'Gestor' : 'Fundador'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verifica e inicia sesión en las integraciones necesarias para tu perfil.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Gmail Service */}
                  <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="text-red-400" size={20} />
                      <div>
                        <h3 className="text-xs font-bold text-white">Gmail & Correo</h3>
                        <p className="text-[11px] text-slate-400">Requerido para el despacho de reportes</p>
                      </div>
                    </div>

                    {gmailConnected ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Check size={12} /> Activo
                      </span>
                    ) : (
                      <button
                        onClick={handleConnectGmail}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors"
                      >
                        Conectar
                      </button>
                    )}
                  </div>

                  {/* GitHub Service (Dev & Founder) */}
                  {(selectedRole === 'dev' || selectedRole === 'founder') && (
                    <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Code2 className="text-amber-400" size={20} />
                        <div>
                          <h3 className="text-xs font-bold text-white">GitHub Integración</h3>
                          <p className="text-[11px] text-slate-400">Repositorios, ramas e historial de cambios</p>
                        </div>
                      </div>

                      {githubConnected ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check size={12} /> Activo
                        </span>
                      ) : (
                        <button
                          onClick={handleConnectGithub}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors"
                        >
                          Conectar GitHub
                        </button>
                      )}
                    </div>
                  )}

                  {/* LinkedIn Service (Management & Founder) */}
                  {(selectedRole === 'management' || selectedRole === 'founder') && (
                    <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="text-blue-400" size={20} />
                        <div>
                          <h3 className="text-xs font-bold text-white">LinkedIn Servicio</h3>
                          <p className="text-[11px] text-slate-400">Búsqueda de perfiles e inteligencia comercial</p>
                        </div>
                      </div>

                      {linkedinConnected ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check size={12} /> Activo
                        </span>
                      ) : (
                        <button
                          onClick={handleConnectLinkedin}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors"
                        >
                          Confirmar LinkedIn
                        </button>
                      )}
                    </div>
                  )}

                  {/* Google Drive Service (Founder) */}
                  {selectedRole === 'founder' && (
                    <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HardDrive className="text-purple-400" size={20} />
                        <div>
                          <h3 className="text-xs font-bold text-white">Google Drive Integración</h3>
                          <p className="text-[11px] text-slate-400">Importación directa de documentos corporativos</p>
                        </div>
                      </div>

                      {driveConnected ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check size={12} /> Activo
                        </span>
                      ) : (
                        <button
                          onClick={handleConnectGmail}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors"
                        >
                          Conectar Drive
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 5: Resumen de Bienvenida */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 text-center py-2"
              >
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">¡Configuración Completada!</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Has configurado tu perfil en modo <strong className="text-white capitalize">{selectedRole === 'dev' ? 'Desarrollador' : selectedRole === 'management' ? 'Gestor' : 'Fundador'}</strong> con tus servicios conectados listos para trabajar.
                  </p>
                </div>

                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Perfil:</span>
                    <span className="font-semibold text-white capitalize">{selectedRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Correo de Reportes:</span>
                    <span className="font-semibold text-white">{userEmail || 'Configurado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado de Integraciones:</span>
                    <span className="font-semibold text-emerald-400">Sincronizado</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Atrás
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/20 ml-auto"
              >
                Siguiente
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-blue-600/25 ml-auto"
              >
                Ingresar a ForgeMind
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
