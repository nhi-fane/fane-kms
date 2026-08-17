import type { Project } from '../hooks/useDashboardData';

export const PROJECT_COLORS = [
  'rgb(139, 86, 245)', // Purple
  'rgb(13, 166, 242)', // Blue
  'rgb(33, 196, 93)',  // Green
  'rgb(219, 20, 60)',  // Red
  'rgb(249, 118, 31)', // Orange
  'rgb(236, 72, 153)', // Pink
  'rgb(20, 184, 166)', // Teal
  'rgb(234, 179, 8)',  // Yellow
  'rgb(99, 102, 241)', // Indigo
  'rgb(168, 85, 247)', // Violet
  'rgb(14, 165, 233)', // Sky
  'rgb(132, 204, 22)', // Lime
  'rgb(244, 63, 94)',  // Rose
  'rgb(16, 185, 129)', // Emerald
  'rgb(217, 119, 6)'   // Amber
];

export const getProjectColor = (projectCode: string, projects: Project[]) => {
  const index = projects.findIndex(p => p.projectCode === projectCode);
  return index >= 0 ? PROJECT_COLORS[index % PROJECT_COLORS.length] : PROJECT_COLORS[0];
};
