import React from 'react';
import {Plus} from 'lucide-react';

export type ActiveSection =
  | 'atlas'
  | 'gallery'
  | 'marketplace'
  | 'portfolio'
  | 'studio';

interface HeaderProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  onOpenUpload,
}) => {
  const navItems: Array<{id: ActiveSection; label: string}> = [
    {id: 'atlas', label: 'Atlas'},
    {id: 'gallery', label: 'Gallery'},
    {id: 'marketplace', label: 'Marketplace'},
    {id: 'portfolio', label: 'Portfolio'},
    {id: 'studio', label: 'Creator Studio'},
  ];

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('atlas');
            window.scrollTo({top: 0, behavior: 'smooth'});
          }}
          className="font-serif text-2xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white rounded"
        >
          Terraframe
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${
                  isActive
                    ? 'text-white border-white'
                    : 'border-transparent hover:text-white hover:border-zinc-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
