export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t w-full py-6 bg-background mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              © {currentYear} OSRS DPS Calculator. Not affiliated with Jagex Ltd.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Old School RuneScape and Jagex are trademarks of Jagex Ltd.
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>
              Data sourced from the{' '}
              <a 
                href="https://oldschool.runescape.wiki/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                OSRS Wiki
              </a>
            </p>
            <p className="mt-1">
              <a
                href="https://github.com/QualitySushi/osrs-simulator"
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}