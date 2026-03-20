// Algoritmo de Cálculo de Inflación Acumulada

/**
 * Función que simula la inflación acumulada (efecto bola de nieve) basándose en una tasa anual.
 * Utiliza un promedio histórico del ~3.1% anual (reflejando la media de los últimos años en la Eurozona).
 * Evitamos llamar a la API del INE porque generaba cuellos de botella y tiempos de carga altísimos ("tarda mucho").
 * 
 * @returns {number} La tasa de inflación anual configurada.
 */
export function getAnnualInflationRate() {
    // Tasa anual del 3.1% (puedes cambiar este valor o ponerlo en Settings futuramente)
    return 0.031; 
}

/**
 * Calcula cuánto dinero "deberías" tener hoy para mantener el poder adquisitivo de todas tus órdenes.
 * Descuenta la inflación de forma retroactiva (diaria/mensual) desde el momento que se invirtió.
 * 
 * @param {Array} orders Lista cronológica de órdenes
 * @returns {Object} { inflationTargetValue }
 */
export function calculateInflationTarget(orders) {
    if (!orders || orders.length === 0) {
        return { inflationTargetValue: 0 };
    }

    const annualRate = getAnnualInflationRate();
    const currentDate = new Date();
    
    let totalEquivalentTodayValue = 0;
    let netInvested = 0;

    for (const order of orders) {
        if (order.type === 'buy' || order.type === 'deposit') {
            const orderDate = new Date(order.date);
            // Calculamos cuántos años y fracción de año han pasado
            const yearsPassed = (currentDate - orderDate) / (1000 * 60 * 60 * 24 * 365.25);
            
            // Si la orden es del futuro (error de usuario), no aplicamos inflación
            if (yearsPassed < 0) continue;

            // Fórmula de interés compuesto para la inflación: importe * (1 + rate)^años
            const equivalenceMultiplier = Math.pow(1 + annualRate, yearsPassed);
            
            totalEquivalentTodayValue += (order.amount * equivalenceMultiplier);
            netInvested += order.amount;
            
        } else if (order.type === 'sell') {
            // Cuando vendemos, restamos la proporción del capital de la equivalencia actual
            const sellRatio = netInvested > 0 ? (order.amount / netInvested) : 0;
            totalEquivalentTodayValue -= (totalEquivalentTodayValue * sellRatio);
            netInvested -= order.amount;
        }
    }

    return { 
        inflationTargetValue: totalEquivalentTodayValue 
    };
}
