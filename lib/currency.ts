/**
 * Currency utilities for PKR (Pakistani Rupee).
 *
 * Storage strategy: All monetary amounts are stored as INTEGER PAISA in MongoDB
 * (1 PKR = 100 paisa). This avoids floating-point drift entirely.
 *
 * API boundary: Route handlers call fromPaisa() on values coming OUT of the DB,
 * and toPaisa() on values coming IN from the client.
 */

/**
 * Convert a PKR rupee value (from the client/form) to integer paisa for DB storage.
 * Always rounds to the nearest paisa to handle any floating-point from JS arithmetic.
 */
export function toPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert integer paisa (from the DB) to a PKR rupee number for client use.
 */
export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

/**
 * Round a rupee value to 2 decimal places.
 * All tax, discount, and total calculations must use this — do NOT use Math.round(x * 100) / 100 inline.
 */
export function roundCurrency(rupees: number): number {
  return Math.round(rupees * 100) / 100;
}

/**
 * Format a rupee value (NOT paisa) for display using the PKR locale.
 */
export function formatPKR(rupees: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format a paisa value from the DB directly to a display string.
 */
export function formatPaisaAsPKR(paisa: number): string {
  return formatPKR(fromPaisa(paisa));
}
