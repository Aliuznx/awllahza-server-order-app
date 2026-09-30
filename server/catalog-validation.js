import { ApiError } from './domain.js';
export function validateProduct(body, previous) {
  const fail = () => { throw new ApiError('invalid_product'); };
  const translated = (input, max, required = true) => {
    if (!input || typeof input !== 'object') return fail();
    for (const lang of ['en', 'ar']) if (typeof input[lang] !== 'string' || input[lang].length > max || (required && !input[lang].trim()) || /[<>\u0000-\u0008]/.test(input[lang])) fail();
    return { en: input.en.trim(), ar: input.ar.trim() };
  };
  if (!body || typeof body.active !== 'boolean' || !Array.isArray(body.variants) || body.variants.length !== previous.variants.length) fail();
  const variants = previous.variants.map(old => {
    const v = body.variants.find(v => v.id === old.id);
    if (!v || !Number.isSafeInteger(v.priceMinor) || v.priceMinor < 1 || v.priceMinor > 10000000 || (v.calories !== null && (!Number.isInteger(v.calories) || v.calories < 0 || v.calories > 100000))) fail();
    return { id: old.id, name: translated(v.name, 120), priceMinor: v.priceMinor, calories: v.calories };
  });
  return { ...previous, active: body.active, name: translated(body.name, 255), description: translated(body.description, 2000, false), ingredients: translated(body.ingredients, 3000, false), note: translated(body.note, 1000, false), variants, priceMinor: variants[0].priceMinor, calories: variants[0].calories };
}
