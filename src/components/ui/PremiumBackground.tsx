import React from 'react';

const PremiumBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
      {/* Dynamic Animated Blobs - Bright & Energetic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-sky-400/30 blur-[120px] animate-[float_15s_infinite_ease-in-out]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber-400/30 blur-[100px] animate-[float_18s_infinite_ease-in-out_reverse]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-emerald-400/30 blur-[110px] animate-[float_20s_infinite_ease-in-out]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-indigo-400/30 blur-[90px] animate-[pulse_10s_infinite_ease-in-out]" />
      </div>

      {/* Grid Overlay - Energetic Blue Tint */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.08]" 
        style={{ 
          backgroundImage: `linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} 
      />
      

      {/* Content Wrapper */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(3%, 5%) scale(1.1); }
          66% { transform: translate(-2%, 8%) scale(0.9); }
        }
      `}} />
    </div>
  );
};

export default PremiumBackground;
