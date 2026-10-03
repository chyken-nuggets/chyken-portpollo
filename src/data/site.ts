/**
 * Everything personal lives here. Replace the [bracketed] placeholders.
 * Search the project for "[" to find any that remain.
 */
export const site = {
  name: 'Dennis Ezekiel Vidar',
  shortName: 'D.E. Vidar',

  /** One line. Shown in the hero, meta description and about page. */
  role: 'bassist / matcha lover / feminist',

  /** One or two sentences. */
  /** \n starts a new line on the page. */
  bio: 'sophomore @ UPLB\nfounder of cinnabyte.',

  location: 'Los Baños, Philippines',

  /** Shown with the blinking cursor on the home and contact pages. */
  availability: 'open to freelance from Oct 2026',

  email: 'crusadersio.ezekiel06@gmail.com',

  socials: [
    { label: 'Instagram', handle: '@chyken.nuggets', url: 'https://www.instagram.com/chyken.nuggets/' },
    { label: 'GitHub', handle: 'chyken-nuggets', url: 'https://github.com/chyken-nuggets' },
    { label: 'LinkedIn', handle: 'Dennis Ezekiel Vidar', url: 'https://www.linkedin.com/in/chyken-nuggets/' },
  ],

  /** About page extras. */
  about: {
    tools: ['NeoVim', 'Git', 'GitHub'],
    languages: ['English', 'Filipino'],
    capabilities: [
      'full stack development',
      'workspace and app integration',
      'can do cool stuff :]',
    ],
    log: [
      { year: '2026', text: 'founded cinnabyte.' },
      { year: '2025', text: 'started studying at UPLB' },
      { year: '2019', text: 'started freelancing' },
    ],
  },

  /** Used for <meta name="description"> when a page does not set its own. */
  description:
    'Portfolio of Dennis Ezekiel Vidar. I develop software.',
} as const;

export type Site = typeof site;
