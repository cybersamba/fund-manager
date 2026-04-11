import React from 'react';
import { BookOpen, TrendingUp, Wallet, Info, ArrowUpRight, ArrowDownLeft, Target, Award, ArrowRightLeft, Flame } from 'lucide-react';

export default function Guide() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                        <BookOpen size={28} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Manual del Inversor</h1>
                </div>
                <p className="text-gray-400 text-lg">Tu guía definitiva para entender cómo funciona la inversión, los conceptos básicos de los fondos y cómo usar esta aplicación paso a paso.</p>
            </header>

            {/* SECCIÓN 1: CONCEPTOS BÁSICOS */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-gray-800 pb-2 text-white/90">📍 1. Conceptos Básicos para Empezar</h2>
                
                <div className="card border-blue-500/10">
                    <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <Info size={18} /> ¿Qué es un Fondo de Inversión?
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        Imagina una bolsa gigantesca donde muchas personas ponen su dinero. Un experto (el "gestor") coge todo ese dinero acumulado y lo invierte por todos ellos en acciones, bonos, oro, etc. 
                        A cambio, tú te llevas tu parte proporcional de los beneficios que el experto consiga. Es una forma excelente de invertir en cientos de empresas a la vez (diversificar) sin tener que comprarlas tú una a una.
                    </p>

                    <h3 className="text-lg font-bold text-blue-400 mb-2 mt-6 flex items-center gap-2">
                        <Target size={18} /> ¿Qué es el NAV (Valor Liquidativo)?
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        El <strong>NAV</strong> (Net Asset Value) es simplemente <strong>el precio que tiene 1 "trocito" (participación) del fondo cada día</strong>. 
                        Si compras 1.000€ en un fondo y el NAV ese día está a 10€, te darán 100 participaciones. 
                        Si un año después el experto ha hecho bien su trabajo y el fondo vale más, el NAV subirá por ejemplo a 12€. Tus 100 participaciones ahora valen 1.200€. ¡Has ganado 200€!
                    </p>

                    <h3 className="text-lg font-bold text-amber-400 mb-2 mt-6 flex items-center gap-2">
                        <Award size={18} /> La Magia del Interés Compuesto
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Es el principio más poderoso de la inversión. Consiste en reinvertir los beneficios que vas ganando, de forma que "los intereses generan nuevos intereses". 
                        Si ganas un 5% de 100€ (5€) y los dejas ahí, al año siguiente ganarás el 5% de 105€, y así sucesivamente creando un efecto bola de nieve espectacular a lo largo de los años.
                    </p>
                </div>
            </section>

            {/* SECCIÓN 2: TWR VS MWR (El dilema de la rentabilidad) */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-gray-800 pb-2 text-white/90 mt-8">📊 2. Las Dos Caras de la Rentabilidad: TWR y MWR</h2>
                <p className="text-gray-400">Cuando veas un porcentaje verde o rojo, es vital saber a qué está respondiendo exactamente para no asustarse frente a caídas temporales del porcentaje.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-background/50 p-6 rounded-xl border border-gray-800 relative overflow-hidden group hover:border-green-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2 text-lg relative z-10">
                            <TrendingUp size={20} />
                            TWR (Rentabilidad del Fondo)
                        </h4>
                        <p className="text-sm text-gray-300 mb-4 relative z-10">
                            <strong>Time-Weighted Return.</strong> Mide cómo se ha comportado "el mercado", dándole igual cuándo hayas metido o sacado tú el dinero.
                        </p>
                        <div className="bg-green-500/10 p-3 rounded text-green-200/90 text-sm relative z-10">
                            <strong>¿Para qué sirve?</strong> Para saber si tu fondo es objetivamente bueno o malo comparado con una alternativa. Aísla tu comportamiento.
                        </div>
                    </div>

                    <div className="bg-background/50 p-6 rounded-xl border border-gray-800 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h4 className="font-bold text-indigo-400 mb-3 flex items-center gap-2 text-lg relative z-10">
                            <Wallet size={20} />
                            MWR / TIR (Tu Rentabilidad Real)
                        </h4>
                        <p className="text-sm text-gray-300 mb-4 relative z-10">
                            <strong>Money-Weighted Return.</strong> Es TU rentabilidad personal. Tiene en cuenta el importe y las fechas exactas en las que enviaste dinero al fondo.
                        </p>
                        <div className="bg-indigo-500/10 p-3 rounded text-indigo-200/90 text-sm relative z-10">
                            <strong>El Efecto Dilución:</strong> Si metes una cantidad enorme de dinero hoy mismo, tu TIR global bajará bruscamente hacia el 0%, porque ese dinero nuevo aún no ha generado beneficio pero ahora "pesa" muchísimo más en tu cartera.
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-xl flex gap-4 mt-6">
                    <div className="text-2xl mt-1">💡</div>
                    <div>
                        <p className="font-semibold text-indigo-200 mb-1">El comodín: TWR 1ª Compra</p>
                        <p className="text-gray-300 text-sm">
                            Podrás encontrar esta métrica en la pestaña <em>Portfolio</em>. Responde a la pregunta: <strong>"¿Cuánto habría ganado en porcentaje anual si mi primera aportación la hubiese dejado ahí sin tocar, en vez de haber seguido aportando dinero cada mes?"</strong> Es fantástica para ver la fuerza de tus primeras compras que llevan más tiempo amasando beneficio.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: LA INFLACIÓN */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-gray-800 pb-2 text-white/90 mt-8">🔥 3. El Ladrón Silencioso: La Inflación</h2>
                <div className="card border-red-500/10">
                    <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                        <Flame size={18} /> ¿Por qué 1.000€ hoy no son 1.000€ mañana?
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        La inflación es el aumento de los precios con el tiempo. Esto significa que tu dinero va perdiendo poder de compra cada día que pasa. 
                        Históricamente, el coste de la vida (supermercado, gasolina, vivienda...) sube de media un <strong>2% - 3% cada año</strong>. 
                        Si guardas tu dinero debajo de un colchón (o en una cuenta corriente que no te paga intereses), estás volviéndote más pobre automáticamente.
                    </p>

                    <h3 className="text-lg font-bold text-red-400 mb-2 mt-6 flex items-center gap-2">
                        <Wallet size={18} /> El "Peaje de Inflación Acumulada"
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        En el <strong>Dashboard</strong> verás una cifra en rojo llamada <em>Peaje Inflación Acumulada</em>. Esta métrica calcula instantáneamente 
                        cuánto poder adquisitivo han "quemado" tus aportaciones desde que las hiciste, suponiendo una inflación media histórica europea. 
                        <br/><br/>
                        <strong>Cómo leerlo:</strong> Tu objetivo principal como inversor no es solo ganar dinero en total, 
                        es que tu <span className="text-green-400 font-semibold">Beneficio Acumulado (Plusvalía)</span> sea suficientemente más grande que tu 
                        <span className="text-red-400 font-semibold"> Peaje Inflacionario</span>. Si lo consigues, tu dinero real está creciendo de verdad.
                    </p>
                </div>
            </section>

            {/* SECCIÓN 4: PORTFOLIO SNOWFLAKE */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-gray-800 pb-2 text-white/90 mt-8">🕸️ 4. Análisis: El 'Portfolio Snowflake'</h2>
                
                <div className="card space-y-4 border-indigo-500/10">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        En la pestaña <strong>Portfolio</strong> verás un gráfico de radar en forma de copo de nieve. Este medidor te da una nota del 0 al 100 de la salud global de tus inversiones basándose en 5 pilares clave. Cuanto más se expanda el color hacia los bordes en todas las direcciones, <strong>más completa y robusta será tu estrategia</strong>.
                    </p>
                    <ul className="space-y-4 text-sm mt-4">
                        <li className="flex gap-3 items-start">
                            <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded font-mono text-xs w-6 text-center">1</span>
                            <div>
                                <strong className="text-white">Eficiencia (TER):</strong> <span className="text-gray-400">Puntúa alto si inviertes en fondos indexados o con comisiones muy bajas. Se contrae si tu cartera paga demasiado a los gestores.</span>
                            </div>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded font-mono text-xs w-6 text-center">2</span>
                            <div>
                                <strong className="text-white">Rendimiento (TWR):</strong> <span className="text-gray-400">Mide el éxito puro. Crecerá cuanto mayor sea la rentabilidad acumulada total que han conseguido los fondos que elegiste en el pasado.</span>
                            </div>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded font-mono text-xs w-6 text-center">3</span>
                            <div>
                                <strong className="text-white">Diversidad:</strong> <span className="text-gray-400">Premia la multiplicidad. Si apuestas todo a un solo fondo, esto se hundirá indicando gran riesgo global. Aumenta al extenderte en más fondos diferentes.</span>
                            </div>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded font-mono text-xs w-6 text-center">4</span>
                            <div>
                                <strong className="text-white">Seguridad:</strong> <span className="text-gray-400">Mide el riesgo. Cuanto más dinero tengas amarrado de forma segura en 'Depósitos', 'Monetarios' o 'Renta Fija', más se expande indicando inmunidad a las caídas de Bolsa.</span>
                            </div>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded font-mono text-xs w-6 text-center">5</span>
                            <div>
                                <strong className="text-white">Disciplina (Mandato):</strong> <span className="text-gray-400">Puntúa al 100% cuando la distribución real de tu dinero cuadra exactamente con tu "Pesos Objetivo" de Configuración. Si te desvías mucho, pide corrección/rebalanceo.</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>

            {/* SECCIÓN 5: CÓMO USAR LA APP */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-gray-800 pb-2 text-white/90 mt-8">🛠️ 5. Rutina: Cómo usar esta aplicación</h2>
                
                <div className="card space-y-6">
                    <div>
                        <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                            <ArrowDownLeft size={16} className="text-green-500"/>
                            A. Registrar una Compra (Aportar dinero)
                        </h4>
                        <p className="text-sm text-gray-400">
                            Ve a la sección <strong>Dashboard</strong> y rellena el formulario "Nueva Orden". Si sabes las participaciones exactas, escríbelas en el campo NAV/Títulos y la app calculará el precio al que has comprado. ¡Haz esto siempre que inyectes ahorro nuevo en tu banco real!
                        </p>
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                        <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                            <ArrowRightLeft size={16} className="text-amber-500"/>
                            B. Vigilar los Desvíos de tu Cartera
                        </h4>
                        <p className="text-sm text-gray-400">
                            En la sección <strong>Settings</strong> puedes definir cuál es tu estrategia ideal (Ejemplo: 80% Fondo Bolsa, 20% Fondo Monetario/Seguro). 
                            Acude cada cierto tiempo a la pestaña <strong>Portfolio</strong>: ahí la app te dirá numéricamente en la columna "Rebalanceo" si necesitas mover el dinero (hacer un traspaso) porque los porcentajes y tus pesos objetivo se han descolocado con las subidas del mercado, asegurándote de no tomar más riesgos de los que habías pactado contigo mismo.
                        </p>
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                        <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                            <Telescope size={16} className="text-blue-500" />
                            C. Usar la Pestaña Watchlist
                        </h4>
                        <p className="text-sm text-gray-400">
                            Observa el comportamiento a fondo de un activo con su gráfico interactivo sin necesidad de comprarlo, ideal para estudiar tendencias o simplemente trazar la historia de tu propia cartera seleccionando en su tabla tu fondo principal.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Re-import missing Telescope local icon requirement
function Telescope({ size, className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.505-4.44"/><path d="m13.56 11.747 4.332-.924"/><path d="M16 21l-2-4"/><path d="M19 21l2-4"/><path d="M21 6.5l-2-4"/><path d="M12 21l-2-4"/><path d="m20.218 6.452l2.646-.867a1.07 1.07 0 0 0 .69-1.265l-.537-2.15a.934.934 0 0 0-1.107-.702l-2.736.582"/><circle cx="15.5" cy="5.5" r="2.5"/></svg>;
}
