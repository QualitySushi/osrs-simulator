export default function HomeHero() {
  return (
    <section className="relative bg-[url('/images/hitsplat.2f589c5c.webp')] bg-cover bg-center py-24 mb-12 text-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative container mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-title text-primary drop-shadow-md mb-6">
          ScapeLab Tools
        </h1>
        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
          Welcome to ScapeLab, a suite of tools to help optimize your Old School RuneScape gameplay.
        </p>
      </div>
    </section>
  );
}
