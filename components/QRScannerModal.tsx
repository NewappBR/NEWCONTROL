
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Inicialização segura
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: window.innerWidth / window.innerHeight
    };

    const onScan = (decodedText: string) => {
       handleStopAndClose(() => onScanSuccess(decodedText));
    };

    const startScanner = async () => {
      try {
        // 1. Tenta câmera traseira (Environment)
        await html5QrCode.start({ facingMode: "environment" }, config, onScan, () => {});
      } catch (err) {
        console.warn("Erro ao iniciar câmera traseira (environment), tentando fallback...", err);
        try {
            // 2. Fallback: Tenta câmera frontal (User)
            await html5QrCode.start({ facingMode: "user" }, config, onScan, () => {});
        } catch (err2) {
            console.warn("Erro ao iniciar câmera frontal (user), tentando qualquer câmera...", err2);
            try {
                // 3. Última tentativa: Sem constraints de facingMode (pega a primeira disponível)
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    await html5QrCode.start(cameras[0].id, config, onScan, () => {});
                } else {
                    throw new Error("Nenhuma câmera detectada.");
                }
            } catch (err3) {
                setError("Não foi possível acessar a câmera. Verifique se o dispositivo possui câmera e se a permissão foi concedida.");
                console.error(err3);
            }
        }
      }
    };

    startScanner();

    // Cleanup ao desmontar
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.warn("Erro ao parar scanner no cleanup", err));
        scannerRef.current.clear().catch(err => console.warn("Erro ao limpar scanner no cleanup", err));
      }
    };
  }, [onScanSuccess]);

  const handleStopAndClose = async (callback?: () => void) => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
              await scannerRef.current.stop();
              await scannerRef.current.clear();
          } catch (e) {
              console.error("Erro ao parar manualmente", e);
          }
      }
      if (callback) callback();
      else onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Header Transparente com Botão Fechar em destaque */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 bg-gradient-to-b from-black/90 to-transparent pb-16">
        <div>
            <h3 className="text-white font-black uppercase tracking-widest text-lg leading-none">Scanner</h3>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[2px] mt-1">Busca Rápida de O.R</p>
        </div>
        <button 
            onClick={() => handleStopAndClose()} 
            className="p-3 bg-red-500/20 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10"
            title="Fechar Scanner"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
        </button>
      </div>

      {/* Área da Câmera Fullscreen */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
         <div id="reader" className="w-full h-full object-cover"></div>
         
         {/* Overlay Visual de Scanning (Só mostra se não houver erro) */}
         {!error && (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[70vw] h-[70vw] max-w-[300px] max-h-[300px] border-2 border-white/30 rounded-[32px] relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                    {/* Cantos */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-[28px]"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-[28px]"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-[28px]"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-[28px]"></div>
                    
                    {/* Laser Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-[scan_2s_infinite_linear]"></div>
                </div>
             </div>
         )}

         {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-center w-[90%] max-w-sm z-30">
                <div className="bg-slate-900/95 backdrop-blur-md p-8 rounded-3xl border border-red-500/30 shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2"/></svg>
                    </div>
                    <h4 className="text-lg font-black uppercase mb-2">Câmera Indisponível</h4>
                    <p className="font-medium text-xs text-slate-400 mb-6 leading-relaxed uppercase">{error}</p>
                    <button onClick={() => handleStopAndClose()} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Voltar ao Início</button>
                </div>
            </div>
         )}
      </div>

      {/* Footer Instruções */}
      {!error && (
          <div className="absolute bottom-0 left-0 right-0 p-8 z-20 text-center pb-safe-bottom">
             <p className="text-white/80 text-xs font-bold uppercase tracking-[2px] animate-pulse drop-shadow-md">
                Aponte a câmera para o código QR
             </p>
          </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        #reader video { object-fit: cover; width: 100%; height: 100%; }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
