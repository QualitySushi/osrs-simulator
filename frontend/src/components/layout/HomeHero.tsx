import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="relative bg-[url('/images/hitsplat.2f589c5c.webp')] bg-cover bg-center py-24 mb-12 text-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative container mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-title text-primary drop-shadow-md mb-6">
          OSRS DPS Calculator
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Optimize your damage output with accurate Old School RuneScape combat calculations.
        </p>
        <Link href="#main" className="btn-primary inline-block">
          Launch Calculator
        </Link>
      </div>
    </section>
  );
}
