/**
 * ANNPerformance.jsx — "Model Performance," recomposed.
 *
 * Same real Recharts visualizations (loss/accuracy curves, ROC curve,
 * confusion matrix) and the same metrics endpoints — recomposed from a
 * centered modal of bordered card-grids into the same quiet editorial
 * report style as AnalyticsDashboard: a slide-in panel, large serif
 * figures instead of icon-boxed metric cards, hairline rules instead
 * of card borders. No chart, metric, or data source was removed.
 */
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { RefreshCw, X } from 'lucide-react'
import { getANNMetrics, getANNLoss, getANNROC, getANNConfusion, getANNStatus } from '../services/api'

function Counter({ to, suffix='', decimals=0 }) {
  const [n, setN] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = parseFloat(to)||0, dur=900
    let start=null
    const step = ts => {
      if(!start) start=ts
      const p=Math.min((ts-start)/dur,1)
      setN(target*(1-Math.pow(1-p,3)))
      if(p<1) raf.current=requestAnimationFrame(step)
    }
    raf.current=requestAnimationFrame(step)
    return ()=>cancelAnimationFrame(raf.current)
  },[to])
  return <>{n.toFixed(decimals)}{suffix}</>
}

/* Large serif figure — replaces the icon-boxed MetricCard pattern. */
function Figure({ label, value, suffix='%', desc, delay=0 }) {
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay,duration:0.5}}>
      <div className="display-2 text-charcoal" style={{ fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)', letterSpacing: '-0.02em' }}>
        <Counter to={parseFloat(value||0)*100} suffix={suffix} decimals={1}/>
      </div>
      <p className="label-xs mt-2">{label}</p>
      {desc && <p className="text-xs text-stone-400 mt-0.5">{desc}</p>}
    </motion.div>
  )
}

const CHART_STYLE = { background:'transparent', fontSize:10, fontFamily:'JetBrains Mono,monospace' }
const AXIS_TICK = { fill:'#A39A8B', fontSize:10 }
const GRID_LINE = { stroke:'#E7E0D5', strokeDasharray:'3 3' }
const TOOLTIP_STYLE = { background:'#1F1D1A', border:'1px solid #383530', borderRadius:2, fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'#fff' }

function LossCurve({ data }) {
  if (!data?.length) return <div className="skeleton h-48"/>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} style={CHART_STYLE}>
        <defs>
          <linearGradient id="trainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#B3654A" stopOpacity={0.16}/>
            <stop offset="95%" stopColor="#B3654A" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#946A33" stopOpacity={0.14}/>
            <stop offset="95%" stopColor="#946A33" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_LINE}/>
        <XAxis dataKey="epoch" tick={AXIS_TICK} tickLine={false} interval={19}/>
        <YAxis tick={AXIS_TICK} tickLine={false} width={36}/>
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{color:'#D5CCBE'}}/>
        <Legend wrapperStyle={{fontSize:10,fontFamily:'JetBrains Mono,monospace'}}/>
        <Area type="monotone" dataKey="train_loss" name="Train Loss" stroke="#B3654A" strokeWidth={1.5} fill="url(#trainGrad)" dot={false}/>
        <Area type="monotone" dataKey="val_loss"   name="Val Loss"   stroke="#946A33" strokeWidth={1.5} fill="url(#valGrad)"  dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AccuracyCurve({ data }) {
  if (!data?.length) return <div className="skeleton h-48"/>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} style={CHART_STYLE}>
        <defs>
          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#5C7355" stopOpacity={0.16}/>
            <stop offset="95%" stopColor="#5C7355" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_LINE}/>
        <XAxis dataKey="epoch" tick={AXIS_TICK} tickLine={false} interval={19}/>
        <YAxis tick={AXIS_TICK} tickLine={false} width={36} domain={[0,1]}/>
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{color:'#D5CCBE'}} formatter={v=>(v*100).toFixed(1)+'%'}/>
        <Area type="monotone" dataKey="accuracy" name="Accuracy" stroke="#5C7355" strokeWidth={1.5} fill="url(#accGrad)" dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ROCCurve({ points, auc }) {
  if (!points?.length) return <div className="skeleton h-48"/>
  const diagonal = [{fpr:0,tpr:0},{fpr:1,tpr:1}]
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow">ROC Curve</span>
        <span className="label-xs">AUC = {(auc||0).toFixed(3)}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart style={CHART_STYLE}>
          <CartesianGrid {...GRID_LINE}/>
          <XAxis dataKey="fpr" type="number" tick={AXIS_TICK} tickLine={false} domain={[0,1]} label={{value:'FPR',position:'insideBottom',offset:-2,style:{fill:'#A39A8B',fontSize:9}}}/>
          <YAxis dataKey="tpr" type="number" tick={AXIS_TICK} tickLine={false} domain={[0,1]} width={36} label={{value:'TPR',angle:-90,position:'insideLeft',style:{fill:'#A39A8B',fontSize:9}}}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>v.toFixed(3)}/>
          <Line data={diagonal} dataKey="tpr" stroke="#D5CCBE" strokeDasharray="4 4" dot={false} strokeWidth={1}/>
          <Line data={points}   dataKey="tpr" stroke="#B3654A" strokeWidth={2} dot={false} strokeLinecap="round"/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ConfusionMatrix({ labels, matrix }) {
  if (!labels?.length || !matrix?.length) return <div className="skeleton h-40"/>
  const maxVal = Math.max(...matrix.flat())
  return (
    <div>
      <span className="eyebrow block mb-4">Style Classification — Confusion Matrix</span>
      <div className="overflow-x-auto">
        <table className="w-full text-center" style={{fontSize:9,fontFamily:'JetBrains Mono,monospace'}}>
          <thead>
            <tr>
              <th className="text-left label-xs pb-2 pr-2 font-normal">True \ Pred</th>
              {labels.map(l => <th key={l} className="pb-2 px-1 capitalize text-stone-400 font-normal">{l.slice(0,4)}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td className="text-left pr-2 capitalize label-xs py-0.5">{labels[ri].slice(0,4)}</td>
                {row.map((val, ci) => {
                  const intensity = maxVal > 0 ? val/maxVal : 0
                  const isDiag = ri===ci
                  return (
                    <td key={ci} className="px-1 py-0.5 transition-colors"
                      style={{
                        background: isDiag
                          ? `rgba(179,101,74,${0.08+intensity*0.30})`
                          : val>0 ? `rgba(162,62,46,${0.04+intensity*0.18})` : 'transparent',
                        color: isDiag ? '#946A33' : val>0 ? '#A23E2E' : '#D5CCBE',
                        fontWeight: isDiag ? 600 : 400,
                        minWidth: 28,
                      }}
                    >{val}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ANNPerformance({ onClose }) {
  const [metrics,   setMetrics]   = useState(null)
  const [loss,      setLoss]      = useState(null)
  const [roc,       setROC]       = useState(null)
  const [confusion, setConfusion] = useState(null)
  const [status,    setStatus]    = useState(null)
  const [loading,   setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [m,l,r,c,s] = await Promise.all([
        getANNMetrics(), getANNLoss(), getANNROC(), getANNConfusion(), getANNStatus(),
      ])
      setMetrics(m); setLoss(l); setROC(r); setConfusion(c); setStatus(s)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { const fn=e=>{if(e.key==='Escape')onClose()}; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn)}, [onClose])

  const m = metrics?.metrics || {}

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.4}}
      className="fixed inset-0 z-50 flex justify-end"
      style={{background:'rgba(31,29,26,0.45)'}}
      onClick={onClose}
    >
      <motion.div
        initial={{x:'4%',opacity:0}} animate={{x:0,opacity:1}}
        exit={{x:'4%',opacity:0}} transition={{duration:0.5,ease:[0.16,1,0.3,1]}}
        className="w-full max-w-2xl h-full overflow-y-auto bg-white"
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-10 pt-10 pb-6 bg-white border-b border-stone-100">
          <div>
            <span className="eyebrow">Studio · Model Performance</span>
            <h2 className="display-2 text-charcoal mt-3" style={{ fontSize: 28 }}>
              Preference Model
            </h2>
            {metrics && (
              <p className="label-xs mt-2">
                v{metrics.model_version} · {metrics.dataset?.total_records||0} training records
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-icon" title="Refresh metrics">
              <RefreshCw size={12} className={loading?'animate-spin-cw':''}/>
            </button>
            <button onClick={onClose} className="btn-icon"><X size={13}/></button>
          </div>
        </div>

        <div className="px-10 py-10 space-y-12">
          {/* Status line */}
          {status && (
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:status.ready?'#5C7355':'#B3654A'}}/>
              <p className="text-xs text-stone-600">{status.message}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-16"/>)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="skeleton h-56"/>
                <div className="skeleton h-56"/>
              </div>
            </div>
          )}

          {!loading && metrics && (
            <>
              {/* Core metrics — editorial figure row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                <Figure label="Accuracy"   value={m.accuracy||0}   desc="Overall classification" delay={0}/>
                <Figure label="Precision"  value={m.precision||0}  desc="Positive predictive"    delay={0.05}/>
                <Figure label="Recall"     value={m.recall||0}     desc="Sensitivity"            delay={0.1}/>
                <Figure label="F1 Score"   value={m.f1_score||0}   desc="Harmonic mean"          delay={0.15}/>
              </div>

              {/* ROC-AUC + confidence — quiet progress rules instead of boxed cards */}
              <div>
                <span className="eyebrow block mb-5">Model Confidence</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  {[
                    {label:'ROC-AUC',        value:m.roc_auc||0,        desc:'Area under ROC curve'},
                    {label:'Avg Confidence', value:m.avg_confidence||0, desc:'Mean ANN output score'},
                    {label:'Positive Rate',  value:m.positive_rate||0,  desc:'Like rate in dataset'},
                  ].map(({label,value,desc},i)=>(
                    <div key={label}>
                      <p className="label-xs mb-1.5">{label}</p>
                      <div className="text-lg text-charcoal tabular-nums mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                        <Counter to={value*100} suffix="%" decimals={1}/>
                      </div>
                      <div className="h-px bg-stone-100 relative mb-2">
                        <motion.div className="absolute top-0 left-0 h-px bg-clay"
                          initial={{width:0}} animate={{width:`${value*100}%`}}
                          transition={{duration:0.8,ease:[0.16,1,0.3,1],delay:0.1+i*0.05}}
                        />
                      </div>
                      <p className="text-xs text-stone-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture info */}
              {metrics.architecture && (
                <div>
                  <span className="eyebrow block mb-5">Architecture</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                      {label:'Input Dimensions', value:metrics.architecture.input_dim},
                      {label:'Total Parameters',  value:metrics.architecture.total_params},
                      {label:'Dataset Records',   value:metrics.dataset?.total_records||0},
                      {label:'Output Heads',       value:metrics.architecture.output_heads?.length||5},
                    ].map(({label,value})=>(
                      <div key={label}>
                        <p className="text-base text-charcoal" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{value}</p>
                        <p className="label-xs mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts — hairline-separated, not bordered cards */}
              <div className="space-y-10 pt-2 border-t border-stone-100">
                <div className="pt-10">
                  <span className="eyebrow block mb-4">Training History — Loss</span>
                  <LossCurve data={loss?.history}/>
                </div>
                <div>
                  <span className="eyebrow block mb-4">Training History — Accuracy</span>
                  <AccuracyCurve data={loss?.history}/>
                </div>
                <div>
                  <ROCCurve points={roc?.points} auc={roc?.auc}/>
                </div>
                <div>
                  <ConfusionMatrix labels={confusion?.labels} matrix={confusion?.matrix}/>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
