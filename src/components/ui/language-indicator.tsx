import { useTranslation } from 'react-i18next';
import { Badge } from './badge';
import { Globe } from 'lucide-react';

const languageNames = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français'
};

export const LanguageIndicator = () => {
  const { i18n } = useTranslation();
  
  const currentLanguage = i18n.language || 'en';
  const languageName = languageNames[currentLanguage as keyof typeof languageNames] || 'English';
  
  return (
    <Badge variant="outline" className="text-xs font-medium">
      <Globe className="w-3 h-3 mr-1" />
      {languageName}
    </Badge>
  );
};