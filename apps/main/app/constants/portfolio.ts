import type { ExperienceItem, FactGroup, NavItem, ProfileData, ProjectItem, SocialItem } from '@/types/portfolio'

export const profile: ProfileData = {
  name: 'Anar Murtuzov',
  intro: 'Software Developer with Web / Full Stack expertise, primarily frontend.',
  about:
    'Software developer with 8+ years in web product development, full-stack understanding, and primary expertise in frontend engineering. Strong in Vue.js, Nuxt.js, and TypeScript with practical React and Node.js experience. Confident in Docker-based delivery and CI/CD practices, and actively uses AI coding agents to accelerate implementation, debugging, and production-quality release cycles.',
}

export const navigation: NavItem[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

export const socialLinks: SocialItem[] = [
  { label: 'GitHub', href: 'https://github.com/amurtuzov', iconName: 'my-icon:github' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/amurtuzov', iconName: 'my-icon:linkedin' },
  { label: 'Upwork', href: 'https://www.upwork.com/freelancers/~017dc24d1bda0aba9a', iconName: 'my-icon:upwork' },
  { label: 'Telegram', href: 'https://t.me/amurtuzov', iconName: 'my-icon:telegram' },
]

export const factGroups: FactGroup[] = [
  {
    title: 'Skills',
    items: [
      'Vue.js, Nuxt.js, React.js',
      'TypeScript, JavaScript',
      'Node.js and backend collaboration',
      'Architecture and team mentoring',
    ],
  },
  {
    title: 'Tools',
    items: [
      'Docker',
      'CI/CD pipelines',
      'Git and code review workflows',
      'AI coding agents in delivery',
    ],
  },
  {
    title: 'Languages',
    items: [
      'English (Professional Working)',
      'Russian (Native/Bilingual)',
    ],
  },
]

export const experiences: ExperienceItem[] = [
  {
    period: 'Jul 2022 - Present',
    role: 'Lead Frontend Engineer · TransTeleCom',
    href: 'https://ttkds.ru/',
    employmentType: 'Full-time',
    workFormat: 'Remote',
    summary:
      'Led frontend direction for high-load products including control panels, analytics interfaces, and interactive web applications. Drove maintainable architecture decisions and mentored engineers to improve delivery quality and consistency.',
    tags: ['Vue', 'React', 'TypeScript', 'Mentoring', 'Node.js', 'Docker'],
  },
  {
    period: 'Oct 2023 - Present',
    role: 'Developer, Lead Solution Team · Redium Limited',
    href: 'https://redium.co.nz/',
    employmentType: 'Freelance',
    workFormat: 'Remote',
    summary:
      'Built production Vue/Nuxt applications across SPA and SSR patterns for scalable web delivery. Contributed across frontend and backend-facing integration work, with occasional Flutter involvement.',
    tags: ['Nuxt', 'Vue', 'TypeScript', 'Flutter'],
  },
  {
    period: 'Sep 2020 - Jul 2022',
    role: 'Senior Frontend Engineer · Independent Media',
    href: 'https://imedia.ru/',
    employmentType: 'Full-time',
    workFormat: 'On-site',
    summary:
      'Developed digital products for multiple publishing brands and implemented internal CMS capabilities. Delivered features with TypeScript, Vue, Nuxt, and Node.js focused on usability and editorial workflows.',
    tags: ['Vue', 'Nuxt', 'TypeScript', 'Node.js'],
  },
  {
    period: 'Feb 2019 - Aug 2020',
    role: 'Frontend Engineer · FITMOST',
    href: 'https://fitmost.ru/',
    employmentType: 'Full-time',
    workFormat: 'On-site',
    summary:
      'Implemented frontend and CMS modules for a high-load fitness aggregator platform with Vue and JavaScript.',
    tags: ['JavaScript', 'Vue 2', 'Webpack', 'CMS'],
  },
]

export const projects: ProjectItem[] = [
  {
    title: 'Personal Website, Portfolio and Photoblog',
    href: 'https://photos.amurtuzov.com/',
    summary:
      'A personal space where visitors can quickly understand who I am, browse photo stories, and get in touch. It is focused on clean reading flow, simple navigation, and a calm visual style that keeps attention on content.',
  },
]

export const cvFileHref = '/docs/Anar-Murtuzov-CV-v4-airy.pdf'
