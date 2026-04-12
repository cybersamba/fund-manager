import React from 'react';
import { BookOpen, TrendingUp, Wallet, Info, ArrowUpRight, ArrowDownLeft, Target, Award, ArrowRightLeft, Flame, Zap, ShieldCheck, Brain, Server, Database } from 'lucide-react';

export default function Guide() {
    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-fade-in-up">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border border-blue-100 mb-2">
                    <BookOpen size={12} /> Versión 2.5 — Documentación Oficial
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Manual del Inversor Pro</h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">Tu guía definitiva para dominar el Fund Manager y entender los pilares de tu independencia financiera.</p>
            </header>

            {/* GRID DE NOVEDADES ARQUITECTÓNICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bento-card p-6 bg-slate-900 text-white">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                        <Brain size={20} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Motor Centralizado</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Un único motor matemático procesa FIFO, MWR y TWR para garantizar que cada céntimo esté bajo control y sin errores de cálculo.</p>
                </div>
                <div className="bento-card p-6 border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                        <Zap size={20} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-slate-900">Optimización O(N)</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">Nuestros gráficos ahora cargan instantáneamente. Hemos optimizado los algoritmos para que la aplicación no sufra sin importar cuántos años de historial tengas.</p>
                </div>
                <div className="bento-card p-6 border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                        <Server size={20} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-slate-900">Cloud Sync</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">Sincronización robusta con Google Drive. Tus datos están a salvo, cifrados por tu propia cuenta y protegidos contra archivos corruptos.</p>
                </div>
            </div>

            {/* SECCIÓN 1: CONCEPTOS BÁSICOS */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-900 font-black text-xs">01</div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Los Pilares Boglehead</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-blue-500" /> ¿Qué es un Fondo de Inversión?
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Un fondo es una "bolsa de activos" gestionada profesionalmente. Comprar una participación de un fondo Vanguard o BlackRock equivale a ser dueño de trocitos de cientos (o miles) de empresas de todo el mundo simultáneamente.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Target size={18} className="text-emerald-500" /> NAV: Tu Precio de Entrada
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                El <strong>NAV (Net Asset Value)</strong> es el precio diario de una participación. Si inviertes 1,000€ con un NAV de 10€, obtienes 100 participaciones. Si el NAV sube a 12€, tu capital será de 1,200€.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bento-card p-8 bg-blue-600 text-white flex flex-col justify-center relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                         <Award size={48} className="mb-6 opacity-40" />
                         <h3 className="text-2xl font-black mb-4 tracking-tight">La Magia del Interés Compuesto</h3>
                         <p className="text-blue-100 text-sm leading-relaxed">
                             Es el motor más potente del universo financiero. Consiste en reinvertir tus ganancias para que éstas generen nuevos beneficios. En el Fund Manager, puedes ver este efecto en el acumulado de tu plusvalía latente con el paso de los años.
                         </p>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: RENTABILIDADES */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-900 font-black text-xs">02</div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Métricas de Rendimiento</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bento-card p-6 border-slate-200 hover:border-indigo-400 transition-colors cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">TWR</div>
                            <h4 className="font-bold text-slate-900">Rentabilidad del Mercado</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            <strong>Time-Weighted Return.</strong> Mide el éxito del fondo en sí, ignorando cuándo metiste o sacaste dinero. Es útil para compararte contra los índices de referencia.
                        </p>
                    </div>
                    <div className="bento-card p-6 border-slate-200 hover:border-blue-400 transition-colors cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">TIR</div>
                            <h4 className="font-bold text-slate-900">Tu Rentabilidad Real</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            <strong>Money-Weighted Return.</strong> Es tu nota personal. Tiene en cuenta el importe y las fechas exactas de tus aportaciones. Si compras mucho justo antes de una subida, tu TIR volará.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: INFLACIÓN */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-900 font-black text-xs">03</div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">El Ladrón Silencioso</h2>
                </div>
                
                <div className="card bg-rose-50/50 border-rose-100 p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="shrink-0">
                            <Flame size={48} className="text-rose-500 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-rose-900">¿Por qué 1.000€ hoy no son 1.000€ mañana?</h3>
                            <p className="text-sm text-rose-800/80 leading-relaxed">
                                La inflación quema tu poder adquisitivo (~2-3% anual). En el Dashboard verás un <strong>"Peaje Inflacionario"</strong>. Tu misión como inversor es que tu plusvalía neta sea siempre mayor que ese peaje para que tu riqueza crezca en términos reales.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PIE DE PÁGINA TECNOLÓGICO */}
            <footer className="pt-20 border-t border-slate-100 text-center">
                <div className="flex justify-center gap-6 mb-8 text-slate-300">
                    <Database size={20} title="Google Drive Persistence" />
                    <Server size={20} title="React Native Backend Architecture" />
                    <Zap size={20} title="High Performance Charts" />
                    <Brain size={20} title="Smart Rebalancing Assistant" />
                </div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.3em]">
                    Fund Manager Pro v2.5 — Built by Antigravity AI
                </p>
            </footer>
        </div>
    );
}
