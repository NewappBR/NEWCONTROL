
import { Order, CompanySettings, DEPARTMENTS, ProductionStep } from '../types';

export const generateTechnicalSheetHtml = (
  order: Order, 
  allOrders: Order[], 
  companySettings: CompanySettings
) => {
  // Encontrar itens irmãos (mesma O.R) e ordenar
  const siblingItems = allOrders
    .filter(o => o.or === order.or)
    .sort((a, b) => {
        const refA = a.numeroItem || '';
        const refB = b.numeroItem || '';
        return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const logoHtml = companySettings?.logoUrl 
    ? `<img src="${companySettings.logoUrl}" style="width: 50px; height: 50px; object-fit: contain; filter: grayscale(100%);">` 
    : '';

  const allAttachments = siblingItems.flatMap(i => i.attachments || []);
  const uniqueAttachments = Array.from(new Set(allAttachments.map(a => a.name)));
  const attachmentSectionHtml = uniqueAttachments.length > 0 
      ? `<div style="margin-top:10px; font-size:10px; border-top:1px dashed #ccc; padding-top:5px;"><strong>ANEXOS GERAIS:</strong> ${uniqueAttachments.join(', ')}</div>`
      : '';

  const headerHtml = `
    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #000; padding-bottom:10px; margin-bottom:20px;">
      <div style="display: flex; gap: 15px; align-items: center;">
        ${logoHtml}
        <div>
          <h1 style="margin:0; font-size:20px; text-transform:uppercase;">${companySettings?.name || 'NEWCOM CONTROL'}</h1>
          <p style="margin:2px 0 0; font-size:10px; color:#555; letter-spacing:1px; font-weight:bold;">FICHA TÉCNICA DE PRODUÇÃO</p>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: #000; color: #fff; padding: 4px 8px; font-weight: bold; font-size: 10px; display: inline-block; margin-bottom: 2px;">DOCUMENTO INTERNO</div>
        <p style="margin:0; font-size:9px; font-weight:bold;">EMISSÃO: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; border: 1px solid #000; padding: 15px;">
      <div style="flex:1;">
          <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #666; display:block; margin-bottom:2px;">CLIENTE / PROJETO</span>
          <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${order.cliente}</div>
          
          <div style="display:flex; gap:20px; margin-top:10px;">
              <div>
                  <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #666; display:block;">VENDEDOR</span>
                  <span style="font-size: 11px; font-weight: bold; text-transform: uppercase;">${order.vendedor}</span>
              </div>
              <div>
                  <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #666; display:block;">PRIORIDADE</span>
                  <span style="font-size: 11px; font-weight: bold; text-transform: uppercase;">${order.prioridade || 'MÉDIA'}</span>
              </div>
              <div>
                  <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #666; display:block;">ABERTURA</span>
                  <span style="font-size: 11px; font-weight: bold; text-transform: uppercase;">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
          </div>
      </div>
      <div style="text-align: right; border-left:1px solid #ccc; padding-left:20px; min-width:120px;">
          <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #666;">ORDEM DE SERVIÇO</span>
          <div style="font-size: 42px; font-weight: 900; line-height: 1;">#${order.or}</div>
          <div style="font-size: 10px; font-weight: bold; margin-top: 5px;">${siblingItems.length} ITEM(NS)</div>
      </div>
    </div>
  `;

  const itemsHtml = siblingItems.map((item, idx) => {
      const refDisplay = item.numeroItem ? `<span style="background:#000; color:#fff; padding:2px 5px; font-size:9px; font-weight:bold; margin-right:5px;">REF: ${item.numeroItem}</span>` : '';
      const itemHeaderStyle = item.isRemake ? 'background:#fff3cd; border-bottom:2px solid #ffc107;' : 'background:#f0f0f0; border-bottom:1px solid #000;';
      const remakeLabel = item.isRemake ? '<span style="border: 2px solid #000; padding: 2px 6px; font-weight: 900; margin-left: 10px; background: #fff; color: #d97706; font-size: 10px;">⚠ REFAZIMENTO</span>' : '';

      // Geração dos Caminhos de Rede
      let pathsHtml = '';
      if (item.filePaths && item.filePaths.length > 0) {
          pathsHtml = item.filePaths.map(p => `<div><span style="font-weight:bold;">${p.name || 'PATH'}:</span> <span style="font-family:monospace;">${p.path}</span></div>`).join('');
      } else if (item.filePath) {
          pathsHtml = `<div><span style="font-weight:bold;">ARQUIVO:</span> <span style="font-family:monospace;">${item.filePath}</span></div>`;
      }
      const pathsSection = pathsHtml 
        ? `<div style="margin-top:8px; font-size:9px; background:#f5f5f5; padding:6px; border-radius:4px; border:1px solid #e5e5e5;">${pathsHtml}</div>` 
        : '';

      // Notas de Produção
      let notesHtml = '';
      if (item.assignments) {
          const notesList = Object.values(item.assignments)
            .filter(a => a && a.note)
            .map(a => `<strong>${a!.userName.split(' ')[0]}:</strong> ${a!.note}`)
            .join(' | ');
          if (notesList) {
              notesHtml = `<div style="margin-top:5px; font-size:9px; font-style:italic; background:#fffbe6; padding:4px; border:1px solid #eee;"><strong>NOTAS EQUIPE:</strong> ${notesList}</div>`;
          }
      }

      // Fluxo Visual Simplificado (Estilo Timeline)
      const steps: {key: ProductionStep, label: string}[] = [
          {key: 'preImpressao', label: 'DESIGN'},
          {key: 'impressao', label: 'IMPRESSÃO'},
          {key: 'producao', label: 'ACABAM.'},
          {key: 'instalacao', label: 'INSTAL.'},
          {key: 'expedicao', label: 'EXPED.'}
      ];
      
      const workflowHtml = `
        <div style="margin-top:12px; margin-bottom: 8px; position: relative; padding: 0 10px;">
            <!-- Linha Conectora -->
            <div style="position: absolute; top: 9px; left: 20px; right: 20px; height: 2px; background: #e5e5e5; z-index: 0;"></div>
            
            <div style="display: flex; justify-content: space-between; position: relative; z-index: 1;">
                ${steps.map(s => {
                    const st = item[s.key];
                    const isDone = st === 'Concluído';
                    const isProgress = st === 'Em Produção';
                    
                    let circleStyle = 'width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ccc; background: #fff;';
                    let labelColor = '#999';
                    let checkMark = '';

                    if (isDone) {
                        circleStyle = 'width: 18px; height: 18px; border-radius: 50%; border: 2px solid #000; background: #000; color: #fff; display: flex; align-items: center; justify-content: center;';
                        labelColor = '#000';
                        checkMark = '<span style="font-size: 10px; line-height: 1;">✓</span>';
                    } else if (isProgress) {
                        circleStyle = 'width: 18px; height: 18px; border-radius: 50%; border: 2px solid #000; background: #fff;';
                        labelColor = '#000';
                    }

                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; background: #fff; padding: 0 4px;">
                            <div style="${circleStyle}">${checkMark}</div>
                            <span style="font-size: 7px; font-weight: bold; margin-top: 4px; color: ${labelColor};">${s.label}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
      `;

      return `
          <div style="margin-bottom: 15px; border: 1px solid #000; page-break-inside: avoid;">
              <div style="${itemHeaderStyle} padding: 6px 10px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="font-weight:bold; font-size:12px;">ITEM #${idx + 1}</span>
                    ${remakeLabel}
                  </div>
                  <span style="font-size:11px; font-weight:bold;">QTD: ${item.quantidade || '1'} UN</span>
              </div>
              <div style="padding: 10px;">
                  <div style="margin-bottom:4px;">${refDisplay} <span style="font-size:14px; font-weight:900; text-transform:uppercase;">${item.item}</span></div>
                  
                  ${workflowHtml}

                  <div style="display:flex; gap:15px; margin-top:10px;">
                      <div style="flex:1;">
                          ${pathsSection}
                          ${item.observacao ? `<div style="background:#f9f9f9; padding:5px; border-left:3px solid #000; margin-top:5px; font-size:10px;"><strong>OBS:</strong> ${item.observacao}</div>` : ''}
                          ${notesHtml}
                      </div>
                      <div style="min-width:90px; text-align:center;">
                          <div style="border: 2px solid #000; padding: 5px;">
                              <span style="display:block; font-size:8px; font-weight:bold; text-transform:uppercase;">ENTREGA</span>
                              <span style="font-size: 16px; font-weight: 900;">${item.dataEntrega.split('-').reverse().join('/')}</span>
                          </div>
                          <div style="font-size:8px; margin-top:4px;">CRIADO: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}</div>
                      </div>
                  </div>
              </div>
          </div>
      `;
  }).join('');

  const allHistory = siblingItems.flatMap(i => i.history || []).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const historyRows = allHistory.length > 0 ? `
      <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:5px; border:1px solid #000;">
          <thead>
              <tr style="background:#ddd;">
                  <th style="border:1px solid #000; padding:4px; text-align:left;">DATA / HORA</th>
                  <th style="border:1px solid #000; padding:4px; text-align:left;">SETOR</th>
                  <th style="border:1px solid #000; padding:4px; text-align:left;">STATUS</th>
                  <th style="border:1px solid #000; padding:4px; text-align:left;">RESPONSÁVEL</th>
              </tr>
          </thead>
          <tbody>
              ${allHistory.map(h => `
                  <tr>
                      <td style="border:1px solid #000; padding:3px;">${new Date(h.timestamp).toLocaleString('pt-BR')}</td>
                      <td style="border:1px solid #000; padding:3px;">${DEPARTMENTS[h.sector] || h.sector}</td>
                      <td style="border:1px solid #000; padding:3px; font-weight:bold;">${h.status}</td>
                      <td style="border:1px solid #000; padding:3px;">${h.userName}</td>
                  </tr>
              `).join('')}
          </tbody>
      </table>
  ` : '<p style="font-size:9px; color:#999; font-style:italic;">Sem histórico registrado.</p>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>FICHA TÉCNICA - OR ${order.or}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 5px; background:#fff; }
      </style>
    </head>
    <body>
      ${headerHtml}
      <div style="margin-bottom:20px;">${attachmentSectionHtml}</div>
      <h3 style="font-size:12px; font-weight:900; text-transform:uppercase; border-bottom:2px solid #000; margin-bottom:10px; padding-bottom:2px;">LISTA DE PRODUÇÃO</h3>
      ${itemsHtml}
      <div style="margin-top:20px; page-break-inside: avoid;">
          <h3 style="font-size:11px; font-weight:bold; text-transform:uppercase; margin-bottom:5px; background:#000; color:#fff; padding:2px 5px; display:inline-block;">RASTREABILIDADE GERAL</h3>
          ${historyRows}
      </div>
      <div style="margin-top:40px; display:flex; justify-content:space-between; page-break-inside: avoid;">
          <div style="border-top:1px solid #000; width:40%; text-align:center; font-size:8px; padding-top:5px;">VISTO PRODUÇÃO</div>
          <div style="border-top:1px solid #000; width:40%; text-align:center; font-size:8px; padding-top:5px;">VISTO QUALIDADE</div>
      </div>
      <div class="footer">DOCUMENTO PROCESSADO PELO SISTEMA NEWCOM CONTROL - OR #${order.or}</div>
    </body>
    </html>
  `;
};
