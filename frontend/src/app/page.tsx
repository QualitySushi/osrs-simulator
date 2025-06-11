import HomeHero from '@/components/layout/HomeHero';

export default function Home() {
  return (
    <>
      <HomeHero />
      <main id="main" className="container mx-auto py-8 px-4 pb-16 text-center">
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Welcome to ScapeLab, a suite of tools to help optimize your Old School RuneScape gameplay.
        </p>
        <p className="text-lg">Choose a tool from the navigation above or the buttons below to get started.</p>
      </main>
    </>
  );
}
