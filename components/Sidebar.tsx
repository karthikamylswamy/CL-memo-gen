
import React from 'react';
import { Section, SectionKey } from '../types';

interface SidebarProps {
  sections: Section[];
  activeSection: SectionKey;
  onSectionChange: (id: SectionKey) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sections, activeSection, onSectionChange }) => {
  const categories = Array.from(new Set(sections.map(s => s.category)));

  return (
    <aside className="w-64 bg-slate-900 h-full flex flex-col shrink-0">
      <div className="p-6 overflow-y-auto custom-scrollbar h-full">
        <div className="flex items-center gap-2 px-3 mb-10">
          <div className="w-6 h-6 bg-tdgreen rounded text-white flex items-center justify-center text-[10px] font-black">TD</div>
          <span className="text-white font-black text-xs uppercase tracking-[0.2em]">Institutional</span>
        </div>
        
        {categories.map((category) => (
          <div key={category} className="mb-8">
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.25em] mb-4 px-3 border-l border-slate-800">
              {category}
            </div>
            <nav className="space-y-1">
              {sections
                .filter(s => s.category === category)
                .map((section) => (
                  <button
                    key={section.id}
                    onClick={() => onSectionChange(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      activeSection === section.id
                        ? 'bg-tdgreen text-white shadow-lg shadow-tdgreen/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-lg opacity-80">{section.icon}</span>
                    <span className="truncate">{section.label}</span>
                  </button>
                ))}
            </nav>
          </div>
        ))}
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Memo Completion</span>
            <span className="text-xs text-tdgreen font-black">72%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-tdgreen w-[72%] rounded-full shadow-[0_0_12px_rgba(0,138,0,0.4)]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;