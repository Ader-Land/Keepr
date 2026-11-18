import { translations } from '../src/i18n/translations';

const LANGUAGES = ['tr', 'en', 'es', 'de', 'fr', 'pt'];
const referenceKeys = Object.keys(translations.en).sort();

describe('translations', () => {
    it('defines all supported languages', () => {
        expect(Object.keys(translations).sort()).toEqual([...LANGUAGES].sort());
    });

    it.each(LANGUAGES)('%s has the same keys as en', (lang) => {
        expect(Object.keys(translations[lang]).sort()).toEqual(referenceKeys);
    });

    it.each(LANGUAGES)('%s has no empty values', (lang) => {
        const empty = Object.entries(translations[lang])
            .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
            .map(([key]) => key);
        expect(empty).toEqual([]);
    });
});
