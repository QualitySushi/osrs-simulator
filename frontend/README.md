ScapeLab DPS Calculator Frontend
A Next.js-based frontend for the ScapeLab DPS Calculator. This application provides a user interface for calculating damage-per-second for different combat styles in Old School RuneScape.
Features

Calculate DPS for all combat styles: Melee, Ranged, and Magic
Select target bosses and their different forms/phases
Choose equipment to automatically update stats
View detailed results with max hit, hit chance, and DPS
Modular component structure with custom hooks
Light and dark theme toggle with saved preference

Technologies Used

Next.js 15 - React framework
React Query - Data fetching and cache management
Zustand - State management
React Hook Form - Form validation
Zod - TypeScript schema validation
shadcn/ui - UI components

Getting Started
Prerequisites

Node.js 20.x or later
npm or yarn or pnpm

Installation

Clone the repository


```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser to use the calculator.

### Testing

Unit tests are written with Jest and React Testing Library.

```bash
npm test
```

### Project Structure

Type definitions live under `src/types` and can be imported using `@/types`.

### Storybook

Components can be explored in Storybook:

```bash
npm run storybook
```

### Theme

Use the sun/moon button in the header to switch between light and dark modes. Your choice is saved in localStorage so it persists between visits.
