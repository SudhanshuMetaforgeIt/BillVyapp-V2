export type ProductRecipe = { productId: string; mode: 'PERCENT' | 'FIXED'; value: number };

export function validProductRecipe(recipe: ProductRecipe[]) {
  return recipe.length <= 30 && new Set(recipe.map((row) => row.productId)).size === recipe.length &&
    recipe.every((row) => row.productId && ['PERCENT', 'FIXED'].includes(row.mode) && Number.isFinite(row.value) &&
      row.value >= 0.0001 && row.value <= (row.mode === 'PERCENT' ? 100 : 1000000) && Math.abs(row.value * 10000 - Math.round(row.value * 10000)) < 0.000001);
}
