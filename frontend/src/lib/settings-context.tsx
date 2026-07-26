'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type MessageDesign = 'slate' | 'classic' | 'emerald' | 'violet';

export interface UserProfileSettings {
  watermarkText: string;
  showWatermark: boolean;
  watermarkOpacity: number;
  messageDesign: MessageDesign;
  userEmail: string;
}

interface SettingsContextType {
  settings: UserProfileSettings;
  updateSettings: (newSettings: Partial<UserProfileSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserProfileSettings = {
  watermarkText: 'ForgeMind • Confidencial',
  showWatermark: true,
  watermarkOpacity: 0.12,
  messageDesign: 'slate',
  userEmail: 'usuario@forgemind.app',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserProfileSettings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('forgemind_profile_settings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }, []);

  const updateSettings = (newSettings: Partial<UserProfileSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('forgemind_profile_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('forgemind_profile_settings', JSON.stringify(defaultSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
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
