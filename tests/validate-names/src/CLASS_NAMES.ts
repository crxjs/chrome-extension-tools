/* -------------------------------------------- */
/*                  CLASS NAMES                 */
/* -------------------------------------------- */

export const multiFindClassName = 'multi-find'
export const textClassName = 'multi-find--text'
export const linkClassName = 'multi-find--link'
export const imageClassName = 'multi-find--image'

export const multiFindClass = '.' + multiFindClassName
export const textClass = '.' + textClassName
export const linkClass = '.' + linkClassName
export const imageClass = '.' + imageClassName

export const getColorClassName = (color: number) =>
  `multi-find--color-${color}`
