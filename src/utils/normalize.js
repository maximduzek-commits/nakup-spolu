/**
 * Strip diacritics and lowercase.
 * "boruvky" matches "Borůvky", "caj" matches "Čaj", "spenat" matches "Špenát", etc.
 */
export function normalize(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
