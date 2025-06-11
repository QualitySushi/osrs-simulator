import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="relative bg-[url('/images/hitsplat.2f589c5c.webp')] bg-cover bg-center py-24 mb-12 text-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative container mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-title text-primary drop-shadow-md mb-6">
          ScapeLab Tools
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Optimize your Old School RuneScape experience with our calculators and simulations.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/calculator" className="btn-primary inline-block">Calculator</Link>
          <Link href="/best-in-slot" className="btn-primary inline-block">Best in Slot</Link>
          <Link href="/simulate" className="btn-primary inline-block">Simulation</Link>
          <Link href="/import" className="btn-primary inline-block">Import</Link>
          <Link href="/about" className="btn-primary inline-block">About</Link>
        </div>
      </div>
    </section>
  );
}
