import { Card, CardColor } from '../game/models.js';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
}

const colorMap: Record<CardColor, string> = {
  Red: 'bg-red-500', Yellow: 'bg-yellow-400', Green: 'bg-green-500', Blue: 'bg-blue-500', Purple: 'bg-purple-500', Gray: 'bg-gray-500',
};

export function CardView({ card, onClick, selected, disabled, small }: CardViewProps) {
  const bgClass = colorMap[card.color] || 'bg-gray-200';
  
  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`
        relative rounded shadow-md border-2 flex items-center justify-center font-bold text-white transition-transform
        ${small ? 'w-12 h-16 text-lg' : 'w-16 h-24 sm:w-20 sm:h-32 text-2xl sm:text-3xl'}
        ${bgClass} ${selected ? 'border-black -translate-y-4 shadow-xl' : 'border-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2'}
      `}
    >
      <div className="absolute top-1 left-1 text-xs opacity-80">{card.value}</div>
      <div>{card.value}</div>
      <div className="absolute bottom-1 right-1 text-xs opacity-80 rotate-180">{card.value}</div>
    </div>
  );
}
