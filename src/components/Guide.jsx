import React from 'react';
import { BookOpen, TrendingUp, Wallet, Info, ArrowUpRight, ArrowDownLeft, Target, Award, ArrowRightLeft, Flame, Zap, ShieldCheck, Brain, Server, Database, Settings, HelpCircle, AlertTriangle } from 'lucide-react';

export default function Guide() {
    return (
        <div className="max-w-5xl mx-auto space-y-16 pb-32 animate-fade-in-up">
            {/* HERO SECTION */}
            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-indigo-100 mb-2">
                    <BookOpen size={12} /> Manual Maestro — Edición Avanzada v2.5
                </div>
                <h1 className="text-5xl font-black tracking-tight text-slate-900">Domina tu Patrimonio</h1>
                <p className="text-slate-500 max-w-3xl mx-auto text-lg leading-relaxed">
                    Esta aplicación no es solo un visor de precios; es un simulador táctico diseñado para aplicar la filosofía <strong>Boglehead</strong> con rigor matemático. Aquí tienes todo lo que necesitas saber.
                </p>
            </header>

            {/* ÍNDICE RÁPIDO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Configuración', 'Órdenes', 'Análisis', 'Matemáticas'].map((item) => (
                    <div key={item} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-400 text-xs uppercase tracking-widest">
                        {item}
                    </div>
                ))}
            </div>

            {/* SECCIÓN 1: CONFIGURACIÓN INTEGRAL */}
            <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Settings size={22} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">1. Configuración y Morningstar</h2>
                        <p className="text-slate-500 text-sm">El primer paso para que todo funcione es la identidad de tus fondos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div className="bento-card p-6 border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 italic">A. El Morningstar ID (Clave de todo)</h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                Para que la aplicación descargue los precios (NAV) automáticamente, debes ir a <strong>Ajustes</strong> y poner el ID de Morningstar de cada fondo. 
                                <br/><br/>
                                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-100">TIP:</span> El ID suele ser una cadena como <code>F00000OWOK</code> que puedes encontrar en la URL de Morningstar al buscar tu fondo.
                            </p>
                        </div>
                        <div className="bento-card p-6 border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 italic">B. Pesos Objetivo (%)</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Define qué porcentaje quieres tener de cada fondo (ej. 80% Renta Variable / 20% Renta Fija). El <strong>Smart Assistant</strong> usará estos números para decirte qué comprar para volver a tu equilibrio si el mercado se mueve.
                            </p>
                        </div>
                    </div>
                    <div className="nano-panel bg-indigo-50/30 border-indigo-100 p-8 space-y-4">
                        <h4 className="font-bold text-indigo-900 uppercase text-[10px] tracking-widest flex items-center gap-2"><Zap size={14}/> Sincronización Automática</h4>
                        <p className="text-indigo-800/70 text-sm leading-relaxed">
                            Una vez configurados los IDs, la app conectará con los servidores de Morningstar cada vez que inicies sesión. Los precios se guardan en una caché local de 24h para no saturar la API, pero puedes forzar una actualización con el botón de "Refrescar" de la barra superior.
                        </p>
                        <div className="pt-4 border-t border-indigo-100">
                            <div className="text-[10px] text-indigo-400 font-mono uppercase tracking-tighter">Estado de conexión:</div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-xs font-bold text-indigo-900">Cloud Sync Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: GESTIÓN DE ÓRDENES */}
            <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <History size={22} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">2. El Libro de Órdenes</h2>
                        <p className="text-slate-500 text-sm">Cómo registrar movimientos sin que descuadren los números.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bento-card p-6 bg-emerald-50 border-emerald-100">
                        <ArrowUpRight className="text-emerald-500 mb-3" />
                        <h4 className="font-bold text-emerald-900 mb-2">Suscripción (Buy)</h4>
                        <p className="text-xs text-emerald-800/70">Registra el <strong>importe invertido</strong> y el <strong>número de participaciones</strong>. Si solo tienes el NAV, divide Importe / NAV para sacar las participaciones.</p>
                    </div>
                    <div className="bento-card p-6 bg-rose-50 border-rose-100">
                        <ArrowDownLeft className="text-rose-500 mb-3" />
                        <h4 className="font-bold text-rose-900 mb-2">Reembolso (Sell)</h4>
                        <p className="text-xs text-rose-800/70">Usa el tipo <strong>Sell</strong>. La aplicación aplicará automáticamente la lógica <strong>FIFO</strong> (First In, First Out), vendiendo primero las participaciones que compraste hace más tiempo.</p>
                    </div>
                    <div className="bento-card p-6 bg-slate-100 border-slate-200">
                        <Database className="text-slate-500 mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2">Depósitos</h4>
                        <p className="text-xs text-slate-600">A diferencia de los fondos, los depósitos tienen una <strong>fecha de vencimiento</strong> y un <strong>tipo de interés</strong>. El valor se mantendrá estático hasta que llegue el vencimiento, momento en que sumará los intereses.</p>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: INTERPRETACIÓN DE MÉTRICAS */}
            <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Target size={22} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">3. Análisis del Copo de Nieve</h2>
                        <p className="text-slate-500 text-sm">¿Cómo se calcula realmente la nota de tu cartera?</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card p-5 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">Eficiencia (TER)</span>
                                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded italic">Comisiones</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">Puntúa 100 si tu TER medio es 0%. Pierdes puntos rápidamente si superas el 0.50% de comisiones. Es vital para el interés compuesto a largo plazo.</p>
                        </div>
                        <div className="card p-5 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">Seguridad</span>
                                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded italic">Riesgo</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">Calcula cuánta parte de tu patrimonio está en activos de volatilidad baja (Monetarios, Depósitos, Renta Fija). Si tienes un 80% en Bolsa, esta punta será pequeña.</p>
                        </div>
                        <div className="card p-5 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">Disciplina</span>
                                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded italic">Mandato</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">Mide la desviación entre tus Pesos Objetivo (Ajustes) y tu cartera real. Si dejas que un fondo crezca demasiado sin rebalancear, perderás disciplina.</p>
                        </div>
                        <div className="card p-5 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-800">Diversidad</span>
                                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded italic">Concentración</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">No solo cuenta el número de fondos, sino cuánto pesan. Tener 10 fondos pero que uno sea el 90% de la inversión te dará una nota de diversidad baja.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: ASISTENTE DE REBALANCEO */}
            <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Brain size={22} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">4. Smart Assistant (Algoritmo de Compra)</h2>
                        <p className="text-slate-500 text-sm">La inteligencia que elimina las emociones de tus inversiones.</p>
                    </div>
                </div>

                <div className="bento-card p-10 bg-slate-50 border-slate-200">
                    <div className="max-w-3xl space-y-6">
                        <div className="flex items-center gap-4">
                            <HelpCircle className="text-blue-500 shrink-0" />
                            <h4 className="text-lg font-bold text-slate-900 italic">¿Cómo funciona el cálculo sugerido?</h4>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            A diferencia de otros simuladores que te dicen "vende esto para comprar aquello", nuestro <strong>Smart Assistant</strong> está optimizado para <strong>inversión periódica</strong>. 
                            <br/><br/>
                            Cuando le dices que vas a invertir, por ejemplo, 2.000€ nuevos este mes, el algoritmo calcula el "Patrimonio Ideal" (Cartera Actual + 2.000€) y luego distribuye esos 2.000€ prioritariamente en los fondos que se han quedado "por debajo" de su objetivo. 
                            <br/><br/>
                            De esta forma, <strong>rebalanceas comprando lo que está barato</strong>, sin tener que vender y pagar impuestos por plusvalías.
                        </p>
                    </div>
                </div>
            </section>

            {/* ERROR BOUNDARIES & SEGURIDAD */}
            <section className="bg-amber-50 rounded-3xl p-10 border border-amber-100">
                <div className="flex gap-6 items-start">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={32} />
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-amber-900 uppercase tracking-tight">Seguridad de Datos y Sincronización</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-amber-900/70 leading-relaxed">
                            <div>
                                <h5 className="font-bold text-amber-800 mb-2">Google Drive Lock</h5>
                                <p>Tus datos nunca salen de tu entorno Google. Si la app detecta que el JSON en Drive está corrupto o tiene un formato ilegible, entrará en modo <strong>"Safe Lock"</strong> y te pedirá restaurar desde un backup local para no sobrescribir nada valioso.</p>
                            </div>
                            <div>
                                <h5 className="font-bold text-amber-800 mb-2">Backups Automáticos</h5>
                                <p>Cada vez que realizas un cambio, la app intenta guardar una copia en el <strong>LocalStorage</strong> de tu navegador. Puedes descargar un JSON de respaldo en cualquier momento desde Ajustes → Exportar.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="pt-20 text-center space-y-6">
                <div className="flex justify-center gap-8 text-slate-300">
                    <Server size={24} />
                    <Database size={24} />
                    <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-[0.4em] mb-2">Fund Manager Professional Suite</p>
                  <p className="text-[9px] font-mono text-slate-300">v2.5.0-STABLE | Engine: central-math-v2 | UI: bento-spatial-v1</p>
                </div>
            </footer>
        </div>
    );
}
