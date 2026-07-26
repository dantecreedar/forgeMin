'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from './i18n';

export type MessageDesign = 'slate' | 'classic' | 'emerald' | 'violet';
export type LanguageOption = 'es' | 'en';

export interface SavedResponseItem {
  id: string;
  title: string;
  content: string;
  date: string;
  design?: MessageDesign;
}

export interface UserProfileSettings {
  watermarkText: string;
  showWatermark: boolean;
  watermarkOpacity: number;
  messageDesign: MessageDesign;
  userEmail: string;
  language: LanguageOption;
}

interface SettingsContextType {
  settings: UserProfileSettings;
  updateSettings: (newSettings: Partial<UserProfileSettings>) => void;
  resetSettings: () => void;
  savedResponses: SavedResponseItem[];
  saveResponse: (title: string, content: string) => void;
  deleteSavedResponse: (id: string) => void;
}

const defaultSettings: UserProfileSettings = {
  watermarkText: 'ForgeMind • Confidencial',
  showWatermark: true,
  watermarkOpacity: 0.12,
  messageDesign: 'slate',
  userEmail: 'usuario@forgemind.app',
  language: 'es',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserProfileSettings>(defaultSettings);
  const [savedResponses, setSavedResponses] = useState<SavedResponseItem[]>([]);

  const loadSaved = () => {
    try {
      const savedList = localStorage.getItem('forgemind_saved_responses');
      if (savedList) {
        setSavedResponses(JSON.parse(savedList));
      } else {
        setSavedResponses([]);
      }
    } catch {
      setSavedResponses([]);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('forgemind_profile_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
        if (parsed.language) {
          i18n.changeLanguage(parsed.language);
        }
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
    loadSaved();

    const handleSync = () => loadSaved();
    window.addEventListener('forgemind:saved-responses-updated', handleSync);
    return () => window.removeEventListener('forgemind:saved-responses-updated', handleSync);
  }, []);

  const updateSettings = (newSettings: Partial<UserProfileSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('forgemind_profile_settings', JSON.stringify(updated));
      if (newSettings.language) {
        localStorage.setItem('forgemind_language', newSettings.language);
        i18n.changeLanguage(newSettings.language);
      }
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('forgemind_profile_settings', JSON.stringify(defaultSettings));
    localStorage.setItem('forgemind_language', 'es');
    i18n.changeLanguage('es');
  };

  const saveResponse = (title: string, content: string) => {
    const newItem: SavedResponseItem = {
      id: 'resp-' + Date.now(),
      title: title || 'Respuesta de Inteligencia',
      content,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      design: settings.messageDesign,
    };

    setSavedResponses((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem('forgemind_saved_responses', JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('forgemind:saved-responses-updated')), 50);
      return updated;
    });
  };

  const deleteSavedResponse = (id: string) => {
    setSavedResponses((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('forgemind_saved_responses', JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('forgemind:saved-responses-updated')), 50);
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, savedResponses, saveResponse, deleteSavedResponse }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useProfileSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useProfileSettings must be used within a SettingsProvider');
  }
  return context;
}
