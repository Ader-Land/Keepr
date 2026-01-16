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
    locked: '#2a2a2aff',
};

export const getColors = (theme) => (theme === 'dark' ? DARK_COLORS : LIGHT_COLORS);
