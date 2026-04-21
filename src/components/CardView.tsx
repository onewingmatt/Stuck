import { type Card, type CardColor } from '../game/models.js';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  glow?: string;
}

const colorMap: Record<CardColor, string> = {
  Red: 'from-rose-500 to-red-600',
  Yellow: 'from-amber-300 to-yellow-500',
  Green: 'from-emerald-400 to-emerald-600',
  Blue: 'from-sky-400 to-blue-600',
  Purple: 'from-violet-400 to-purple-700',
  Gray: 'from-slate-300 to-slate-600',
  Pink: 'from-fuchsia-400 to-pink-600',
  Orange: 'from-amber-400 to-orange-600',
};

const suitSymbol: Record<CardColor, string> = {
  Red: '◆', Yellow: '◇', Green: '♣', Blue: '♠', Purple: '✦', Gray: '●',
  Pink: '♥', Orange: '☀',
};

export function CardView({ card, onClick, selected, disabled, small, glow }: CardViewProps) {
  const bgClass = colorMap[card.color] || 'bg-gray-200';
  const sym = suitSymbol[card.color] || '?';
  
  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`
        relative isolate flex items-center justify-center overflow-visible font-bold text-white transition-all duration-200 ease-out
${small ? 'h-16 w-12 text-lg rounded-sm' : 'h-24 w-16 text-2xl sm:h-32 sm:w-20 sm:text-3xl rounded-2xl'}
        bg-gradient-to-br ${bgClass}
        ${selected ? 'z-20 -translate-y-5 scale-[1.04] ring-2 ring-cyan-300/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)]' : glow ? `ring-1 ring-white/25 ${glow}` : 'ring-1 ring-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.3)]'}
        ${disabled ? 'opacity-40 cursor-not-allowed saturate-50' : small ? '' : 'cursor-pointer card-hover-lift'}
      `}
    >
      <div className={`absolute inset-0 ${small ? 'rounded-sm' : 'rounded-2xl'} bg-[linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.05)_30%,rgba(0,0,0,0.15)_100%)] mix-blend-soft-light`} />
      <div className="absolute left-1.5 top-1.5 text-[10px] font-black uppercase tracking-wider opacity-80 leading-none">{sym}</div>
      <div className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{card.value}</div>
      <div className="absolute bottom-1.5 right-1.5 text-[10px] font-black uppercase tracking-wider opacity-80 rotate-180 leading-none">{sym}</div>
    </div>
  );
}
