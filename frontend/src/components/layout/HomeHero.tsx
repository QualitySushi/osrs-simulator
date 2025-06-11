import { LogoSpinner } from '../ui/LogoSpinner';

export default function HomeHero() {
  return (
    <section className="relative bg-[url('/images/hitsplat.2f589c5c.webp')] bg-cover bg-center py-24 mb-12 text-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative container mx-auto px-4">
        <LogoSpinner className="w-48 h-48 mx-auto mb-6" />
        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
          Welcome to ScapeLab, a suite of tools to help optimize your Old School RuneScape gameplay.
        </p>
      </div>
    </section>
  );
}
