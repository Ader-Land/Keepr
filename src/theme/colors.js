import { Appearance } from 'react-native';

export const LIGHT_COLORS = {
    bg: '#F5F5F5',
    card: '#FFFFFF',
    text: '#121212',
    subText: '#666666',
    primary: '#FF5252',
    secondary: '#4CAF50',
    border: '#E0E0E0',
    accent: '#6200EE',
    locked: '#E0E0E0',
    progressBg: '#E8E8E8',
    buttonBg: '#E0E0E0',
    badgeTitle: '#FF5252',
};

export const DARK_COLORS = {
    bg: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    subText: '#A0A0A0',
    primary: '#FF5252',
    secondary: '#4CAF50',
    border: '#333333',
    accent: '#BB86FC',
    locked: '#2a2a2a',
    progressBg: '#333333',
    buttonBg: '#333333',
    badgeTitle: '#FF5252',
};

export const OCEAN_COLORS = {
    bg: '#0D1B2A',
    card: '#1B2838',
    text: '#E0F7FA',
    subText: '#80CBC4',
    primary: '#00BCD4',
    secondary: '#26A69A',
    border: '#1E3A5F',
    accent: '#00E5FF',
    locked: '#1B2838',
    progressBg: '#1E3A5F',
    buttonBg: '#1E3A5F',
    badgeTitle: '#00BCD4',
};

export const SUNSET_COLORS = {
    bg: '#FFF8E1',
    card: '#FFFFFF',
    text: '#3E2723',
    subText: '#8D6E63',
    primary: '#FF6D00',
    secondary: '#FF8F00',
    border: '#FFE0B2',
    accent: '#FF3D00',
    locked: '#FFE0B2',
    progressBg: '#FFE0B2',
    buttonBg: '#FFE0B2',
    badgeTitle: '#FF6D00',
};

export const FOREST_COLORS = {
    bg: '#1B2D1B',
    card: '#243324',
    text: '#E8F5E9',
    subText: '#A5D6A7',
    primary: '#66BB6A',
    secondary: '#AED581',
    border: '#2E5A2E',
    accent: '#00E676',
    locked: '#243324',
    progressBg: '#2E5A2E',
    buttonBg: '#2E5A2E',
    badgeTitle: '#66BB6A',
};

export const LAVENDER_COLORS = {
    bg: '#F3E5F5',
    card: '#FFFFFF',
    text: '#311B92',
    subText: '#7E57C2',
    primary: '#9C27B0',
    secondary: '#BA68C8',
    border: '#E1BEE7',
    accent: '#E040FB',
    locked: '#E1BEE7',
    progressBg: '#E1BEE7',
    buttonBg: '#E1BEE7',
    badgeTitle: '#9C27B0',
};

const THEMES = {
    light: LIGHT_COLORS,
    dark: DARK_COLORS,
    ocean: OCEAN_COLORS,
    sunset: SUNSET_COLORS,
    forest: FOREST_COLORS,
    lavender: LAVENDER_COLORS,
};

export const THEME_LIST = [
    { id: 'system', preview: '#9E9E9E', accent: '#FF5252' },
    { id: 'light', preview: '#F5F5F5', accent: '#FF5252' },
    { id: 'dark', preview: '#121212', accent: '#FF5252' },
    { id: 'ocean', preview: '#0D1B2A', accent: '#00BCD4' },
    { id: 'sunset', preview: '#FFF8E1', accent: '#FF6D00' },
    { id: 'forest', preview: '#1B2D1B', accent: '#66BB6A' },
    { id: 'lavender', preview: '#F3E5F5', accent: '#9C27B0' },
];

// 'system' follows the OS color scheme. Appearance is read at call time, and
// the settings store mirrors the OS scheme (see App.js) so screens re-render on change.
export const resolveTheme = (theme) => {
    if (theme === 'system') {
        return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    }
    return theme;
};

export const getColors = (theme) => THEMES[resolveTheme(theme)] || LIGHT_COLORS;

export const isDarkTheme = (theme) => ['dark', 'ocean', 'forest'].includes(resolveTheme(theme));
