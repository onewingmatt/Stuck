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
  Red: 'bg-red-600', Yellow: 'bg-yellow-500', Green: 'bg-emerald-600', Blue: 'bg-blue-600', Purple: 'bg-purple-600', Gray: 'bg-slate-500',
  Pink: 'bg-pink-500', Orange: 'bg-orange-500',
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
        relative rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 overflow-hidden
        ${small ? 'w-12 h-16 text-lg' : 'w-16 h-24 sm:w-20 sm:h-32 text-2xl sm:text-3xl'}
        ${bgClass} ${selected ? 'border-2 border-black -translate-y-4 shadow-xl' : glow ? `border border-white/30 ${glow}` : 'border border-white/30 shadow-lg'}
        ${disabled ? 'opacity-40 cursor-not-allowed saturate-50' : small ? '' : `cursor-pointer card-hover-lift`}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      <div className="absolute top-1 left-1 text-[10px] opacity-70 leading-none">{sym}</div>
      <div className="relative z-10 drop-shadow">{card.value}</div>
      <div className="absolute bottom-1 right-1 text-[10px] opacity-70 rotate-180 leading-none">{sym}</div>
    </div>
  );
}
