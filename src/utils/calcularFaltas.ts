/**
 * Calculates the percentage of absences for a student.
 * Rule: each absence is worth 5% fixed.
 * Default limit: 25% (= 5 absences).
 */

/**
 * Calculates the percentage of absences based on the number of absences.
 * @param totalFaltas - Number of absences (F + J count equally)
 * @returns - Percentage of absences (ex: 25)
 */
export function calcularPorcentagemFaltas(totalFaltas: number): number {
  return totalFaltas * 5;
}

/**
 * Checks if the student is in critical status.
 * @param totalFaltas - Number of student absences
 * @param limitePorcentagem - Class limit in % (default: 25)
 * @returns
 */
export function isCritico(totalFaltas: number, limitePorcentagem: number = 25): boolean {
  const porcentagem = calcularPorcentagemFaltas(totalFaltas);
  return porcentagem >= limitePorcentagem;
}

/**
 * Returns the student's status situation.
 * @param totalFaltas
 * @param limitePorcentagem
 * @returns {'Regular' | 'Critical'}
 */
export function getSituacao(totalFaltas: number, limitePorcentagem: number = 25): 'Regular' | 'Critical' {
  return isCritico(totalFaltas, limitePorcentagem) ? 'Critical' : 'Regular';
}

/**
 * Returns how many absences are left for the student to reach the limit.
 * @param totalFaltas
 * @param limitePorcentagem
 * @returns - Absences remaining until the limit (0 if already reached)
 */
export function faltasRestantes(totalFaltas: number, limitePorcentagem: number = 25): number {
  const limiteFaltas = limitePorcentagem / 5;
  const restantes = limiteFaltas - totalFaltas;
  return restantes > 0 ? restantes : 0;
}

/**
 * Converts limit percentage to number of absences.
 * Useful for displaying "limit: 5 absences" in the interface.
 * @param limitePorcentagem
 * @returns
 */
export function limiteEmFaltas(limitePorcentagem: number = 25): number {
  return limitePorcentagem / 5;
}
