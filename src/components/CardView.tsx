import { type Card, type CardColor } from '../game/models.js';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  glow?: string;
}

const bgColor: Record<CardColor, string> = {
  Red: 'bg-rose-500',
  Yellow: 'bg-amber-300',
  Green: 'bg-emerald-400',
  Blue: 'bg-sky-400',
  Purple: 'bg-violet-400',
  Gray: 'bg-slate-300',
  Pink: 'bg-fuchsia-400',
  Orange: 'bg-amber-400',
};

const glossOverlay = 'bg-[linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.05)_40%,rgba(0,0,0,0.2)_100%)]';

const suitSymbol: Record<CardColor, string> = {
  Red: '◆', Yellow: '◇', Green: '♣', Blue: '♠', Purple: '✦', Gray: '●',
  Pink: '♥', Orange: '☀',
};

export function CardView({ card, onClick, selected, disabled, small, glow }: CardViewProps) {
  const bg = bgColor[card.color] || 'bg-gray-200';
  const sym = suitSymbol[card.color] || '?';
  const radius = small ? 'rounded-lg' : 'rounded-2xl';
  
  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`
        relative isolate flex items-center justify-center overflow-visible font-bold text-white transition-all duration-200 ease-out
        ${small ? 'h-16 w-12 text-lg rounded-lg' : 'h-24 w-16 text-2xl sm:h-32 sm:w-20 sm:text-3xl rounded-2xl'}
        ${bg}
        ${selected ? 'z-20 -translate-y-5 scale-[1.04] ring-2 ring-cyan-300/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)]' : glow ? `ring-1 ring-white/25 ${glow}` : 'ring-1 ring-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.3)]'}
        ${disabled ? 'opacity-40 cursor-not-allowed saturate-50' : small ? '' : 'cursor-pointer card-hover-lift'}
      `}
    >
      <div
        className={`absolute inset-0 ${radius}`}
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%, rgba(0,0,0,0.15))', mixBlendMode: 'soft-light' }}
      />
      <div className={`absolute ${small ? 'left-1 top-1 text-[8px]' : 'left-1.5 top-1.5 text-[10px]'} font-black uppercase tracking-wider opacity-80 leading-none`}>{sym}</div>
      <div className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{card.value}</div>
      <div className="absolute bottom-1.5 right-1.5 text-[10px] font-black uppercase tracking-wider opacity-80 rotate-180 leading-none">{sym}</div>
    </div>
  );
}
