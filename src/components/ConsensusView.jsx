import React, { useMemo } from 'react';
import { METRICS, extractData, getStatusColor } from '../utils/metrics';
import { Target, Zap, EyeOff, Info } from 'lucide-react';
import consensusNarratives from '../data/consensus_master.json';
import { MANUAL_CONSENSUS_ALIGNMENT } from '../data/manualConsensusAlignment';
import './ConsensusDashboard.css';

function normalizeStatus(status) {
  return (status || 'ND').toLowerCase().trim();
}

function computeConsensus(competitors, metricKey, isMacro) {
  let validStances = [];
  let validValues = [];
  
  competitors.forEach(comp => {
    const data = extractData(comp, metricKey, isMacro);
    if (data.status && data.status.toLowerCase() !== 'nd') {
      validStances.push({ status: data.status.toLowerCase(), value: data.value, compName: comp.manager });
      
      if (isMacro && data.value) {
        const matches = data.value.match(/[-+]?[0-9]*\.?[0-9]+/g);
        if (matches) {
          const nums = matches.map(Number);
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          validValues.push(avg);
        }
      }
    }
  });

  const coverage = validStances.length;
  const total = competitors.length;
  const coveragePercent = Math.round((coverage / total) * 100);

  let dominantStance = 'ND';
  let consensusValue = '';

  if (coverage > 0) {
    const counts = {};
    let max = 0;
    validStances.forEach(v => {
      counts[v.status] = (counts[v.status] || 0) + 1;
      if (counts[v.status] > max) {
        max = counts[v.status];
        dominantStance = v.status;
      }
    });

    if (isMacro && validValues.length > 0) {
      validValues.sort((a, b) => a - b);
      const mid = Math.floor(validValues.length / 2);
      const median = validValues.length % 2 !== 0 ? validValues[mid] : (validValues[mid - 1] + validValues[mid]) / 2;
      consensusValue = median.toFixed(2);
      if (consensusValue.endsWith('.00')) consensusValue = parseInt(consensusValue).toString();
    }
  }

  return { coverage, total, coveragePercent, dominantStance, consensusValue };
}

export default function ConsensusView({ edram, competitors, onShowEvidence }) {
  const insights = useMemo(() => {
    if (!edram || !competitors.length) {
      return { aligned: [], differentiators: [], blindspots: [] };
    }

    let aligned = [];
    let differentiators = [];
    let blindspots = [];

    METRICS.forEach(section => {
      section.items.forEach(item => {
        const eData = extractData(edram, item.key, section.isMacro);
        const consensus = computeConsensus(competitors, item.key, section.isMacro);
        
        if (normalizeStatus(eData.status) !== 'nd') {
          const insightData = { section: section.section, item, eData, consensus, isMacro: section.isMacro };
          const manualBucket = MANUAL_CONSENSUS_ALIGNMENT[item.key]?.bucket;
          const isTrueBlindspot = consensus.coveragePercent < 50;

          if (manualBucket === 'differentiator') {
            differentiators.push(insightData);
          } else if (manualBucket === 'blindspot' && isTrueBlindspot) {
            blindspots.push(insightData);
          } else if (manualBucket === 'aligned') {
            aligned.push(insightData);
          }
        }
      });
    });

    return { aligned, differentiators, blindspots };
  }, [edram, competitors]);

  if (!edram || !competitors.length) return null;

  const renderCard = (insight, index) => {
    const { item, eData, consensus, isMacro, section } = insight;
    const aiNarrative = consensusNarratives[item.key];
    const manualMeta = MANUAL_CONSENSUS_ALIGNMENT[item.key];
    const isBlindspot = manualMeta?.bucket === 'blindspot';
    const disclosedCount = `${consensus.coverage}/${consensus.total}`;
    
    return (
      <div key={`${item.key}-${index}`} className="insight-card">
        <div className="card-header">
          <span className="card-section">{section}</span>
          <button 
             className="evidence-icon"
             onClick={() => onShowEvidence({ 
               metric: item.label, 
               edram: eData, 
               competitor: null, 
               compName: "Market Consensus" 
             })}
          >
            <Info size={14} />
          </button>
        </div>
        
        <h4 className="card-metric">{item.label}</h4>
        
        <div className="card-comparison">
          <div className="card-side">
            <span className="side-label border-edram">EdRAM View</span>
            {eData.status.toLowerCase() === 'qualitative' ? (
               <div className="qualitative-text">Qualitative View</div>
            ) : (
               <div className="value-display" style={{color: getStatusColor(eData.status)}}>
                 {isMacro && eData.value ? <span className="macro-val">{eData.value}</span> : null}
                 <span className="stance-text">{eData.status}</span>
               </div>
            )}
            <div className="why-preview">{eData.wording ? `"${eData.wording}"` : eData.why}</div>
          </div>
          
          <div className="card-side">
            <span className="side-label border-comp">{isBlindspot ? 'Peer Disclosure' : 'Market Consensus'}</span>
            {isBlindspot ? (
              <>
                <div className="value-display" style={{color: 'var(--status-nd-text)'}}>
                  <span className="stance-text">Majority ND</span>
                </div>
                <div className="coverage-bar">
                  <div className="track">
                    <div className="fill" style={{ width: `${consensus.coveragePercent}%` }} />
                  </div>
                  <span>{disclosedCount} disclosed</span>
                </div>
                <div className="why-preview consensus-narrative">
                  Most competitors do not publish a directly comparable view on this metric.
                </div>
              </>
            ) : (
              <>
                <div className="value-display" style={{color: getStatusColor(consensus.dominantStance)}}>
                  {isMacro && consensus.consensusValue ? <span className="macro-val">~{consensus.consensusValue}</span> : null}
                  <span className="stance-text">{consensus.dominantStance}</span>
                </div>
                {aiNarrative && (
                  <div className="why-preview consensus-narrative">{aiNarrative}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="consensus-dashboard animate-fade-in">
      
      {insights.differentiators.length > 0 && (
        <section className="insight-section">
          <header className="section-head">
            <div className="icon-wrapper bg-divergent"><Zap size={18} /></div>
            <div>
              <h3>Not Aligned With Consensus</h3>
              <p>Manual analyst attribution of the few areas where EdRAM does not line up with the broader market view.</p>
            </div>
          </header>
          <div className="card-grid">
            {insights.differentiators.map(renderCard)}
          </div>
        </section>
      )}

      {insights.aligned.length > 0 && (
        <section className="insight-section">
          <header className="section-head">
            <div className="icon-wrapper bg-aligned"><Target size={18} /></div>
            <div>
              <h3>Aligned With Consensus</h3>
              <p>Manual analyst attribution of the market-consensus areas that are broadly consistent with EdRAM's view.</p>
            </div>
          </header>
          <div className="card-grid">
            {insights.aligned.map(renderCard)}
          </div>
        </section>
      )}

      {insights.blindspots.length > 0 && (
        <section className="insight-section">
          <header className="section-head">
            <div className="icon-wrapper bg-blindspot"><EyeOff size={18} /></div>
            <div>
              <h3>Market Blindspots (EdRAM Standouts)</h3>
              <p>Areas where EdRAM provides a clear view, but the majority of competitors have Not Disclosed.</p>
            </div>
          </header>
          <div className="card-grid">
            {insights.blindspots.map(renderCard)}
          </div>
        </section>
      )}

    </div>
  );
}
