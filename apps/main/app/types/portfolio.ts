export type NavItem = {
  id: 'about' | 'experience' | 'projects' | 'contact'
  label: string
}

export type SocialItem = {
  label: string
  href: string
  iconName: string
}

export type ExperienceItem = {
  period: string
  role: string
  href: string
  employmentType: string
  workFormat: string
  summary: string
  tags: string[]
}

export type ProjectItem = {
  title: string
  href: string
  summary: string
}

export type FactGroup = {
  title: string
  items: string[]
}

export type ProfileData = {
  name: string
  intro: string
  about: string
}
