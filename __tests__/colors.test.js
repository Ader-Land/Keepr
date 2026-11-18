import { Appearance } from 'react-native';
import {
    resolveTheme,
    getColors,
    isDarkTheme,
    DARK_COLORS,
    LIGHT_COLORS,
    THEME_LIST,
} from '../src/theme/colors';

afterEach(() => jest.restoreAllMocks());

describe('theme resolution', () => {
    it('system follows a dark OS scheme', () => {
        jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
        expect(resolveTheme('system')).toBe('dark');
        expect(getColors('system')).toBe(DARK_COLORS);
        expect(isDarkTheme('system')).toBe(true);
    });

    it('system follows a light OS scheme and falls back to light when unknown', () => {
        const spy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
        expect(resolveTheme('system')).toBe('light');
        expect(getColors('system')).toBe(LIGHT_COLORS);
        expect(isDarkTheme('system')).toBe(false);
        spy.mockReturnValue(null);
        expect(resolveTheme('system')).toBe('light');
    });

    it('explicit themes ignore the OS scheme', () => {
        jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
        expect(resolveTheme('light')).toBe('light');
        expect(isDarkTheme('light')).toBe(false);
        expect(isDarkTheme('ocean')).toBe(true);
        expect(isDarkTheme('forest')).toBe(true);
        expect(isDarkTheme('sunset')).toBe(false);
    });

    it('unknown theme falls back to light colors', () => {
        expect(getColors('does-not-exist')).toBe(LIGHT_COLORS);
    });

    it('theme list contains system and every entry resolves to colors', () => {
        expect(THEME_LIST.map((t) => t.id)).toContain('system');
        THEME_LIST.forEach((t) => expect(getColors(t.id).bg).toBeTruthy());
    });
});
