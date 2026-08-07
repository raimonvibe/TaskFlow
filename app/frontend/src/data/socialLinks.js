/**
 * Same marks, same brand colours as raimonvibe/digital-marketing's footer -
 * with one deliberate difference: TaskFlow's footer is *always* on a dark
 * navy surface (it doesn't flip with the light/dark toggle), so the near-
 * black marks (X, TikTok, Medium, GitHub, the website globe) use the source
 * component's own "colourDark" values instead of their true near-black
 * brand colour. That's the same swap the source makes for dark mode, and
 * for the same reason: solid black on navy is invisible.
 */
export const SOCIAL_LINKS = [
  { id: 'website', label: 'raimonvibe.eu', url: 'https://www.raimonvibe.eu/', colour: '#bcb5a4' },
  { id: 'x', label: 'X', url: 'https://x.com/raimonvibe/', colour: '#efeade' },
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCDGDNuYb2b2Ets9CYCNVbuA/videos/',
    colour: '#ff0000',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@raimonvibe/',
    colour: '#efeade',
    fill: 'chromatic',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/raimonvibe/',
    colour: '#e1306c',
    fill: 'gradient',
  },
  { id: 'medium', label: 'Medium', url: 'https://medium.com/@raimonvibe/', colour: '#efeade' },
  { id: 'github', label: 'GitHub', url: 'https://github.com/raimonvibe/', colour: '#efeade' },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/raimonvibe/',
    colour: '#0a66c2',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61563450007849',
    colour: '#1877f2',
  },
]
