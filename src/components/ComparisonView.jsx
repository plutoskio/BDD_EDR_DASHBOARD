import React from 'react';
import { METRICS, extractData, formatValueDisplay } from '../utils/metrics';
import { Info } from 'lucide-react';
import './DataTable.css';

export default function ComparisonView({ edram, competitor, onShowEvidence }) {
  if (!edram || !competitor) return null;
  
  return (
    <div className="comparison-container animate-fade-in">
      {METRICS.map((section) => {
        let comparableRows = [];
        
        section.items.forEach(item => {
          const eData = extractData(edram, item.key, section.isMacro);
          const cData = extractData(competitor, item.key, section.isMacro);
          
          const eValid = eData.status && eData.status !== 'ND' && eData.status !== 'nd';
          const cValid = cData.status && cData.status !== 'ND' && cData.status !== 'nd';
          
          const obj = { item, eData, cData };
          
          if (eValid && cValid) comparableRows.push(obj);
        });
        
        if (comparableRows.length === 0) {
          return null;
        }

        const renderRow = (obj) => {
          const { item, eData, cData } = obj;
          
          return (
            <div key={item.key} className="data-row">
              <div className="col-metric" style={{ paddingTop: '2px' }}>
                <span className="metric-label">{item.label}</span>
                <button 
                   className="evidence-trigger"
                   onClick={() => onShowEvidence({ 
                     metric: item.label, 
                     edram: eData, 
                     competitor: cData, 
                     compName: competitor.manager 
                   })}
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="col-edram cell">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <div>{formatValueDisplay(eData)}</div>
                  {eData.status !== 'ND' && (eData.wording || eData.why) && (
                    <div className="qualitative-quote">{eData.wording ? `"${eData.wording}"` : eData.why}</div>
                  )}
                </div>
              </div>
              <div className="col-comp cell">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <div>{formatValueDisplay(cData)}</div>
                  {cData.status !== 'ND' && (cData.wording || cData.why) && (
                    <div className="qualitative-quote">{cData.wording ? `"${cData.wording}"` : cData.why}</div>
                  )}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div key={section.section} className="glass-panel section-panel mb-8">
            <h3 className="section-title">{section.section}</h3>
            
            <div className="data-table">
              <div className="data-header">
                <div className="col-metric">Indicator</div>
                <div className="col-edram">EdRAM</div>
                <div className="col-comp">{competitor.manager}</div>
              </div>
              
              <div className="data-body">
                {comparableRows.map(renderRow)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
