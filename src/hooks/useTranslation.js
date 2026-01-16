import { useCallback } from 'react';
import useSettingsStore from '../store/useSettingsStore';
import { translations } from '../i18n/translations';

export const useTranslation = () => {
    const language = useSettingsStore((state) => state.language);

    const t = useCallback((key, params = {}) => {
        const langData = translations[language] || translations['en'];
        let text = langData[key] || translations['en'][key] || key;

        // Simple parameter replacement (e.g., %{count})
        Object.keys(params).forEach(param => {
            text = text.replace(`%{${param}}`, params[param]);
        });

        return text;
    }, [language]);

    return { t, language };
};
