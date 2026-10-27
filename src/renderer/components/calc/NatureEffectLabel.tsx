import { getNatureEffect } from '../../config/vgcData';

/**
 * "+Atk −SpA" beside the Nature label, colored to match CalcStatRows' nature
 * coding (red = boosted, blue = lowered). Native <option>s can't hold styled
 * text, so the colored version lives next to the select instead.
 */
export default function NatureEffectLabel({ nature }: { nature: string }) {
  const effect = getNatureEffect(nature);
  if (!effect) return null;
  return (
    <span className="normal-case font-bold">
      <span className="text-red-400">+{effect.plus}</span>{' '}
      <span className="text-blue-400">−{effect.minus}</span>
    </span>
  );
}
