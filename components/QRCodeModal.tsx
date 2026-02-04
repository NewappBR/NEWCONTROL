
import React, { useState, useRef } from 'react';
import { Order, CompanySettings } from '../types';
import * as htmlToImage from 'html-to-image';

interface QRCodeModalProps {
  order: Order;
  companySettings: CompanySettings;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ order, companySettings, onClose }) => {
  const [totalVolumes, setTotalVolumes] = useState(1);
  const [currentView, setCurrentView] = useState(1);
  const [observation, setObservation] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [printMode, setPrintMode] = useState<'A5' | 'TAG'>('A5');

  const labelRef = useRef<HTMLDivElement>(null);

  // GERAÇÃO DE TEXTO PURO PARA O QR CODE
  const generateQRText = (vol: number, total: number, obs: string) => {
    return [
      `OR: ${order.or}`,
      `REF: ${order.numeroItem || 'N/A'}`,
      `CLI: ${order.cliente}`,
      `ITEM: ${order.item}`,
      `ENT: ${order.dataEntrega}`,
      `VOL: ${vol}/${total}`,
      obs ? `OBS: ${obs}` : ''
    ].filter(Boolean).join('|');
  };

  const qrData = generateQRText(currentView, totalVolumes, observation);
  // Usando API de QR Code confiável (goqr.me ou qrserver)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrData)}&ecc=M&margin=0`;

  const downloadImage = async (ref: React.RefObject<HTMLDivElement>, name: string) => {
    if (ref.current) {
      setIsExporting(true);
      try {
        await new Promise(r => setTimeout(r, 400));
        const dataUrl = await htmlToImage.toPng(ref.current, { 
          quality: 1, 
          backgroundColor: '#ffffff',
          pixelRatio: 3, // Alta resolução para impressão nítida
          cacheBust: true
        });
        const link = document.createElement('a');
        link.download = `${name}_OR${order.or}_VOL${currentView}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Erro na exportação:', err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handlePrintBatch = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlContent = '';
    let styleContent = '';

    // Preparar LOGO HTML
    const logoHtml = companySettings.logoUrl 
        ? `<img src="${companySettings.logoUrl}" style="max-height: 40px; max-width: 80px; object-fit: contain; margin-right: 10px;" />` 
        : '';

    // Preparar NOTES HTML (Divisão Solicitada)
    let notesContentHtml = '';
    if (observation) {
        notesContentHtml += `<div style="margin-bottom:4px;"><strong>NOTA EXTRA:</strong> ${observation}</div>`;
    }
    if (observation && order.observacao) {
        notesContentHtml += `<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>`;
    }
    if (order.observacao) {
        notesContentHtml += `<div><strong>OBS. O.R:</strong> ${order.observacao}</div>`;
    }
    if (!notesContentHtml) notesContentHtml = '<span style="color:#999;">-</span>';


    if (printMode === 'A5') {
        // --- ESTILO A5 ---
        styleContent = `
            @page { size: A5 portrait; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-after: always; }
            .label-container {
                width: 148mm;
                height: 210mm;
                padding: 10mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                position: relative;
            }
            .border-box { border: 4px solid #000; height: 100%; display: flex; flex-direction: column; }
            
            /* HEADER */
            .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 4px solid #000; height: 60px; }
            .brand-wrapper { display: flex; align-items: center; }
            .brand-box h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; line-height: 1; }
            .brand-box p { margin: 2px 0 0; font-size: 8px; font-weight: bold; letter-spacing: 1px; }
            .meta-box { text-align: right; }
            .date { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
            .doc-badge { background: #000; color: #fff; padding: 3px 6px; font-size: 9px; font-weight: bold; display: inline-block; }

            /* ADDRESSES */
            .addresses { display: flex; border-bottom: 4px solid #000; height: 90px; }
            .sender { width: 35%; padding: 8px 10px; border-right: 3px solid #000; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
            .receiver { width: 65%; padding: 8px 10px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
            
            .label-sm { font-size: 8px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; display: block; color: #555; }
            .text-md { font-size: 11px; font-weight: bold; line-height: 1.1; text-transform: uppercase; }
            
            /* Melhoria para nomes longos de cliente */
            .text-lg { 
                font-size: 18px; 
                font-weight: 900; 
                line-height: 1.1; 
                text-transform: uppercase; 
                word-wrap: break-word; 
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* CENTER INFO */
            .center-info { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; }
            .or-label { font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 2px; }
            .or-number { font-size: 64px; font-weight: 900; line-height: 0.9; margin: 0 0 10px 0; letter-spacing: -2px; }
            .qr-wrapper { position: relative; margin-bottom: 10px; }
            .qr-corners { border: 4px solid #000; padding: 5px; display: inline-block; }
            .ref-box { background: #000; color: #fff; padding: 4px 15px; font-size: 16px; font-weight: bold; border-radius: 4px; }

            /* ITEM DESC */
            .item-section { border-top: 4px solid #000; padding: 8px 15px; height: 50px; display: flex; flex-direction: column; justify-content: center; }
            .item-val { font-size: 14px; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* GRID */
            .grid-info { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 3px solid #000; border-bottom: 3px solid #000; height: 50px; }
            .col { padding: 5px 10px; border-right: 3px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; }
            .col:last-child { border-right: none; }
            .col-val { font-size: 14px; font-weight: 900; margin-top: 2px; text-transform: uppercase; }

            /* NOTES SPLIT STYLE */
            .notes-section { padding: 8px 15px; background: #f4f4f4; border-bottom: 4px solid #000; height: 70px; overflow: hidden; }
            .note-content { font-size: 11px; text-transform: uppercase; line-height: 1.2; }

            /* FOOTER */
            .footer { display: flex; justify-content: space-between; align-items: flex-end; padding: 10px 15px; height: 50px; }
            .sys-info p { margin: 0; font-size: 8px; font-weight: bold; text-transform: uppercase; }
            .volume-box { text-align: right; }
            .vol-label { font-size: 10px; font-weight: bold; display: block; }
            .vol-val { font-size: 42px; font-weight: 900; line-height: 0.8; }
        `;

        htmlContent = Array.from({ length: totalVolumes }).map((_, i) => {
            const vol = i + 1;
            const volQrData = generateQRText(vol, totalVolumes, observation);
            const volQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(volQrData)}&ecc=M&margin=0`;
            
            return `
             <div class="label-container page-break">
               <div class="border-box">
                 <div class="header">
                    <div class="brand-wrapper">
                        ${logoHtml}
                        <div class="brand-box">
                            <h1>${companySettings.name}</h1>
                            <p>GRUPO INDUSTRIAL</p>
                        </div>
                    </div>
                    <div class="meta-box">
                        <div class="date">${new Date().toLocaleDateString('pt-BR')}</div>
                        <div class="doc-badge">DOC. OFICIAL</div>
                    </div>
                 </div>

                 <div class="addresses">
                    <div class="sender">
                        <span class="label-sm">REMETENTE</span>
                        <div class="text-md">${companySettings.name}</div>
                        <div style="font-size: 8px; margin-top:2px; line-height:1;">${companySettings.address}</div>
                    </div>
                    <div class="receiver">
                        <span class="label-sm">DESTINATÁRIO / CLIENTE</span>
                        <div class="text-lg">${order.cliente}</div>
                    </div>
                 </div>

                 <div class="center-info">
                    <div class="or-label">ORDEM DE SERVIÇO</div>
                    <div class="or-number">#${order.or}</div>
                    <div class="qr-wrapper">
                        <div class="qr-corners">
                            <img src="${volQrUrl}" width="140" height="140" style="display:block;">
                        </div>
                    </div>
                    ${order.numeroItem ? `<div class="ref-box">REF: ${order.numeroItem}</div>` : ''}
                 </div>

                 <div class="item-section">
                    <span class="label-sm">DESCRIÇÃO DO ITEM</span>
                    <div class="item-val">${order.item}</div>
                 </div>

                 <div class="grid-info">
                    <div class="col">
                        <span class="label-sm">QUANTIDADE</span>
                        <div class="col-val">${order.quantidade || '1'} UN</div>
                    </div>
                    <div class="col">
                        <span class="label-sm">ENTREGA</span>
                        <div class="col-val">${order.dataEntrega.split('-').reverse().join('/')}</div>
                    </div>
                    <div class="col">
                        <span class="label-sm">VENDEDOR</span>
                        <div class="col-val">${order.vendedor.split(' ')[0]}</div>
                    </div>
                 </div>

                 <div class="notes-section">
                    <div class="note-content">
                        ${notesContentHtml}
                    </div>
                 </div>

                 <div class="footer">
                    <div class="sys-info">
                        <p>CONTROLE DE PRODUÇÃO</p>
                        <p>SISTEMA NEWCOM</p>
                    </div>
                    <div class="volume-box">
                        <span class="vol-label">VOLUME</span>
                        <div class="vol-val">${vol} / ${totalVolumes}</div>
                    </div>
                 </div>
               </div>
             </div>
            `;
         }).join('');

    } else {
        // --- ESTILO TAG 15x15 ---
        styleContent = `
            @page { size: 150mm 150mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-after: always; }
            .tag-container {
                width: 150mm;
                height: 150mm;
                padding: 5mm;
                box-sizing: border-box;
            }
            .tag-border {
                width: 100%; height: 100%;
                border: 8px solid #000;
                display: flex; flex-direction: column;
                box-sizing: border-box;
            }
            .tag-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 15px;
                border-bottom: 6px solid #000;
                height: 60px;
            }
            .tag-brand { font-size: 16px; font-weight: 900; text-transform: uppercase; }
            .tag-meta { text-align: right; }
            .tag-or { font-size: 28px; font-weight: 900; line-height: 0.9; }
            .tag-ref { background: #000; color: #fff; font-weight: bold; font-size: 12px; padding: 2px 6px; display: inline-block; margin-top: 2px; }
            
            .tag-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; overflow: hidden; }
            
            /* Cliente Longo na Tag */
            .tag-client { 
                font-size: 28px; 
                font-weight: 900; 
                text-transform: uppercase; 
                text-align: center; 
                line-height: 1.1; 
                margin-top: 10px;
                max-height: 70px;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .tag-footer {
                border-top: 6px solid #000;
                padding: 10px 15px;
                display: flex; justify-content: space-between; align-items: flex-end;
                height: 80px;
            }
            .tag-desc { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }
            .tag-note { font-size: 10px; font-weight: bold; text-transform: uppercase; border-top: 1px solid #000; padding-top: 2px; margin-top: 2px; }
            .tag-vol { font-size: 50px; font-weight: 900; line-height: 0.8; }
        `;

        htmlContent = Array.from({ length: totalVolumes }).map((_, i) => {
            const vol = i + 1;
            const volQrData = generateQRText(vol, totalVolumes, observation);
            const volQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(volQrData)}&ecc=M&margin=1`;

            return `
                <div class="tag-container page-break">
                    <div class="tag-border">
                        <div class="tag-header">
                            <div style="display:flex; align-items:center;">
                                ${logoHtml}
                                <div class="tag-brand">${companySettings.name}</div>
                            </div>
                            <div class="tag-meta">
                                <div class="tag-or">#${order.or}</div>
                                ${order.numeroItem ? `<div class="tag-ref">REF ${order.numeroItem}</div>` : ''}
                            </div>
                        </div>
                        <div class="tag-center">
                            <img src="${volQrUrl}" width="200" height="200" style="display:block;">
                            <div class="tag-client">${order.cliente}</div>
                        </div>
                        <div class="tag-footer">
                            <div style="flex: 1; padding-right: 10px;">
                                <div class="tag-desc">${order.item}</div>
                                <div style="font-size:10px;">
                                    ${notesContentHtml}
                                </div>
                            </div>
                            <div class="tag-vol">${vol}/${totalVolumes}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    printWindow.document.write(`
       <!DOCTYPE html>
       <html>
       <head>
         <title>Etiquetas O.R ${order.or}</title>
         <style>
             ${styleContent}
         </style>
       </head>
       <body>
          ${htmlContent}
          <script>
             window.onload = function() { window.print(); }
          </script>
       </body>
       </html>
    `);
    printWindow.document.close();
  };

  // --- PREVIEW COMPONENTS (VISUAL IDENTICAL TO PRINT) ---

  const LabelA5Template = ({ volIndex }: { volIndex: number }) => (
    <div className="bg-white w-[148mm] h-[210mm] border-[4px] border-black flex flex-col font-sans text-black box-border relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b-[4px] border-black h-[70px]">
         <div className="flex items-center gap-3">
            {companySettings.logoUrl && (
                <img src={companySettings.logoUrl} className="h-10 w-auto object-contain" alt="Logo" />
            )}
            <div>
                <h1 className="text-xl font-[950] uppercase leading-none">{companySettings.name}</h1>
                <p className="text-[9px] font-bold tracking-widest uppercase mt-0.5">GRUPO INDUSTRIAL</p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-bold mb-1">{new Date().toLocaleDateString('pt-BR')}</p>
            <div className="bg-black text-white px-2 py-0.5 text-[9px] font-bold uppercase inline-block">DOC. OFICIAL</div>
         </div>
      </div>

      {/* Addresses */}
      <div className="flex border-b-[4px] border-black h-[100px]">
         <div className="w-[35%] p-3 border-r-[3px] border-black flex flex-col justify-center overflow-hidden">
            <span className="text-[8px] font-bold uppercase block mb-1 text-gray-500">REMETENTE</span>
            <p className="text-[11px] font-black uppercase leading-tight">{companySettings.name}</p>
            <p className="text-[8px] uppercase leading-tight mt-1">{companySettings.address}</p>
         </div>
         <div className="w-[65%] p-3 flex flex-col justify-center pl-4 overflow-hidden">
            <span className="text-[8px] font-bold uppercase block mb-1 text-gray-500">DESTINATÁRIO / CLIENTE</span>
            <p className="text-lg font-[950] uppercase leading-[1.1] break-words line-clamp-3">
                {order.cliente}
            </p>
         </div>
      </div>

      {/* Center (OR + QR) */}
      <div className="flex-1 flex flex-col items-center justify-center p-2">
         <span className="text-[10px] font-bold tracking-[4px] uppercase mb-1">ORDEM DE SERVIÇO</span>
         <h2 className="text-[64px] font-[950] leading-none tracking-tighter mb-3">#{order.or}</h2>
         
         <div className="border-[4px] border-black p-2 bg-white">
            <img src={qrUrl} className="w-32 h-32 object-contain block" alt="QR" />
         </div>

         {order.numeroItem && (
             <div className="bg-black text-white px-4 py-1 text-lg font-bold rounded mt-4">REF: {order.numeroItem}</div>
         )}
      </div>

      {/* Item Desc */}
      <div className="border-t-[4px] border-black p-3 h-[60px] flex flex-col justify-center">
         <span className="text-[8px] font-bold uppercase text-gray-500 block mb-1">DESCRIÇÃO DO ITEM</span>
         <p className="text-base font-[950] uppercase leading-tight truncate">{order.item}</p>
      </div>

      {/* Grid Info */}
      <div className="grid grid-cols-3 border-t-[3px] border-b-[3px] border-black h-[60px]">
         <div className="p-2 text-center border-r-[3px] border-black flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase text-gray-500 block">QUANTIDADE</span>
            <p className="text-sm font-[950] uppercase">{order.quantidade || '1'} UN</p>
         </div>
         <div className="p-2 text-center border-r-[3px] border-black flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase text-gray-500 block">ENTREGA</span>
            <p className="text-sm font-[950] uppercase">{order.dataEntrega.split('-').reverse().join('/')}</p>
         </div>
         <div className="p-2 text-center flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase text-gray-500 block">VENDEDOR</span>
            <p className="text-sm font-[950] uppercase">{order.vendedor.split(' ')[0]}</p>
         </div>
      </div>

      {/* Notes Split */}
      <div className="p-3 bg-gray-100 border-b-[4px] border-black h-[80px] overflow-hidden flex flex-col text-[10px] uppercase font-bold leading-snug">
         {observation && (
             <div className="mb-1">
                 <span className="font-black mr-1">NOTA EXTRA:</span> {observation}
             </div>
         )}
         {observation && order.observacao && (
             <div className="border-t border-dashed border-black my-1 opacity-50"></div>
         )}
         {order.observacao && (
             <div>
                 <span className="font-black mr-1">OBS. O.R:</span> {order.observacao}
             </div>
         )}
         {!observation && !order.observacao && <span className="text-gray-400">-</span>}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end p-4 h-[60px]">
         <div>
            <p className="text-[9px] font-bold uppercase">CONTROLE DE PRODUÇÃO</p>
            <p className="text-[9px] font-bold uppercase">SISTEMA NEWCOM</p>
         </div>
         <div className="text-right">
            <span className="text-[10px] font-bold block mb-1">VOLUME</span>
            <p className="text-5xl font-[950] leading-[0.8]">{volIndex} / {totalVolumes}</p>
         </div>
      </div>
    </div>
  );

  const TagTemplate = ({ volIndex }: { volIndex: number }) => (
    <div className="bg-white w-[150mm] h-[150mm] p-4 flex flex-col font-sans text-black box-border">
       <div className="w-full h-full border-[8px] border-black flex flex-col box-border">
          {/* Tag Header */}
          <div className="flex justify-between items-center p-4 border-b-[6px] border-black h-[70px]">
             <div className="flex items-center gap-2">
                {companySettings.logoUrl && <img src={companySettings.logoUrl} className="h-8 w-auto" alt="Logo" />}
                <div className="text-lg font-[950] uppercase">{companySettings.name}</div>
             </div>
             <div className="text-right">
                <div className="text-3xl font-[950] leading-none mb-1">#{order.or}</div>
                {order.numeroItem && <div className="bg-black text-white text-sm font-bold px-2 inline-block">REF {order.numeroItem}</div>}
             </div>
          </div>

          {/* Tag Center */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
             <img src={qrUrl} className="w-48 h-48 object-contain mb-2" alt="QR" />
             <div className="text-3xl font-[950] uppercase text-center leading-[1.1] break-words line-clamp-2 max-w-full">
                 {order.cliente}
             </div>
          </div>

          {/* Tag Footer */}
          <div className="border-t-[6px] border-black p-4 flex justify-between items-end h-[90px]">
             <div className="flex-1 pr-4 overflow-hidden">
                <div className="text-base font-[950] uppercase leading-none mb-2 truncate">{order.item}</div>
                
                {/* Notes Split Small */}
                <div className="text-[9px] uppercase font-bold leading-tight">
                    {observation && <div><span className="font-black">NOTA:</span> {observation}</div>}
                    {observation && order.observacao && <div className="border-t border-black my-0.5 opacity-30"></div>}
                    {order.observacao && <div><span className="font-black">OBS:</span> {order.observacao}</div>}
                </div>
             </div>
             <div className="text-6xl font-[950] leading-[0.8]">
                {volIndex}/{totalVolumes}
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/95 backdrop-blur-xl md:p-4 overflow-hidden">
      <div className="w-full h-full md:max-w-[1300px] md:h-full md:max-h-[95vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 md:rounded-[32px] shadow-4xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* SIDEBAR / CONTROLS */}
        <div className="w-full md:w-[340px] shrink-0 bg-slate-50 dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex flex-col p-4 md:p-6 space-y-4 z-20 shadow-md">
          <div className="flex justify-between items-center md:block">
            <div>
              <h4 className="text-xl font-[950] text-slate-900 dark:text-white uppercase tracking-tighter leading-none">ETIQUETA CONTROL</h4>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[4px] mt-1 italic">PADRÃO INDUSTRIAL</p>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
          </div>

          <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
            <button onClick={() => setPrintMode('A5')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${printMode === 'A5' ? 'bg-white dark:bg-slate-600 text-black dark:text-white shadow-sm ring-1 ring-black/10' : 'text-slate-500 hover:text-slate-800'}`}>A5 (148x210)</button>
            <button onClick={() => setPrintMode('TAG')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${printMode === 'TAG' ? 'bg-white dark:bg-slate-600 text-black dark:text-white shadow-sm ring-1 ring-black/10' : 'text-slate-500 hover:text-slate-800'}`}>TAG (150x150)</button>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Volumes</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setTotalVolumes(Math.max(1, totalVolumes - 1))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-lg text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">-</button>
                <div className="flex-1 text-center font-[950] text-3xl tabular-nums text-slate-900 dark:text-white">{totalVolumes}</div>
                <button onClick={() => setTotalVolumes(totalVolumes + 1)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-lg text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">+</button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nota Extra (Opcional)</label>
              <textarea 
                value={observation}
                onChange={e => setObservation(e.target.value.toUpperCase())}
                placeholder="EX: FRÁGIL / CUIDADO"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold uppercase outline-none h-20 resize-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <button onClick={handlePrintBatch} className="w-full py-4 bg-black dark:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth="2.5"/></svg>
              IMPRIMIR TODOS
            </button>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => downloadImage(labelRef, printMode)} disabled={isExporting} className="py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">BAIXAR PNG</button>
               <button onClick={onClose} className="hidden md:block py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">FECHAR</button>
            </div>
          </div>
        </div>

        {/* PREVIEW AREA */}
        <div className="flex-1 bg-slate-200 dark:bg-black p-4 md:p-10 flex flex-col items-center justify-center overflow-auto relative custom-scrollbar">
          <div className="transition-all duration-500 origin-center shadow-2xl shrink-0 my-auto" style={{ transform: 'scale(var(--scale-factor, 0.6))' }}>
             <div ref={labelRef}>
                {printMode === 'A5' ? <LabelA5Template volIndex={currentView} /> : <TagTemplate volIndex={currentView} />}
             </div>
          </div>

          <div className="absolute bottom-6 flex items-center gap-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-6 py-2 rounded-full shadow-xl border border-white/20">
             <button onClick={() => setCurrentView(Math.max(1, currentView - 1))} className="p-2 hover:text-emerald-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
             <span className="text-xs font-black uppercase tracking-widest tabular-nums min-w-[60px] text-center">VOL {currentView} / {totalVolumes}</span>
             <button onClick={() => setCurrentView(Math.min(totalVolumes, currentView + 1))} className="p-2 hover:text-emerald-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg></button>
          </div>
        </div>
      </div>
      
      {/* Dynamic Scale Logic CSS */}
      <style>{`
        @media (max-width: 768px) { :root { --scale-factor: 0.35; } }
        @media (min-width: 769px) { :root { --scale-factor: 0.65; } }
        @media (min-width: 1400px) { :root { --scale-factor: 0.8; } }
      `}</style>
    </div>
  );
};

export default QRCodeModal;
