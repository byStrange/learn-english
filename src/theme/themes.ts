import {defineTheme} from '@curialy/ui/theme';
import {themes} from '../ui-themes';

/**
 * "Grammar in colour" — see DESIGN.md.
 * Three themes from one base: learner (Group 1 + home), kids (Group 2), teacher (desktop).
 */
const heading = {family: 'Baloo 2', fallbacks: '"Trebuchet MS", system-ui, sans-serif'};
const body = {family: 'Lexend', fallbacks: '"Segoe UI", system-ui, sans-serif'};

const surfaces = {
  '--color-background-body': '#F3F7FF',
  '--color-background-surface': '#FFFFFF',
  '--color-background-card': '#FFFFFF',
  '--color-text-primary': '#172033',
  '--color-text-secondary': '#475069',
  '--focus-outline-width': '3px',
  '--focus-outline-offset': '2px',
  '--focus-outline-color': '#1D5FD1',
} as const;

export const learnTheme = defineTheme({
  name: 'learn',
  extends: themes.butter,
  color: {accent: ['#1D5FD1', '#7AA7FF'], neutralStyle: 'cool'},
  typography: {heading, body, scale: {base: 17, ratio: 1.2}},
  radius: {base: 8, multiplier: 1.5},
  motion: {character: 'standard'},
  tokens: {
    ...surfaces,
    // Touch-sized controls: 36 / 44 / 52 px
    '--size-element-sm': '36px',
    '--size-element-md': '44px',
    '--size-element-lg': '52px',
  },
});

export const kidsTheme = defineTheme({
  name: 'learn-kids',
  extends: learnTheme,
  color: {accent: ['#1D5FD1', '#7AA7FF'], neutralStyle: 'cool'},
  // typography replaces the whole block when extending, so restate the families.
  typography: {heading, body, scale: {base: 20, ratio: 1.25}},
  radius: {base: 8, multiplier: 2},
  tokens: {
    ...surfaces,
    '--size-element-sm': '44px',
    '--size-element-md': '56px',
    '--size-element-lg': '64px',
  },
});

export const teacherTheme = defineTheme({
  name: 'learn-teacher',
  extends: learnTheme,
  color: {accent: ['#1D5FD1', '#7AA7FF'], neutralStyle: 'cool'},
  typography: {heading, body, scale: {base: 15, ratio: 1.2}},
  radius: {base: 6, multiplier: 1.25},
  tokens: {
    ...surfaces,
    '--size-element-sm': '28px',
    '--size-element-md': '36px',
    '--size-element-lg': '44px',
  },
});
