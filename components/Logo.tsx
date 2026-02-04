
import React from 'react';

interface LogoProps {
  src?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ src, className = "w-full h-full" }) => {
  if (src) {
    return <img src={src} alt="Logo" className={`${className} object-contain`} />;
  }

  // LOGO "PENA" (FEATHER)
  // Design simples e elegante representando leveza e escrita.
  return (
    <svg 
        className={className} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Corpo da Pena */}
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        
        {/* Haste Central (Quill) descendo até a ponta de escrita */}
        <line x1="16" y1="8" x2="2" y2="22" />
        
        {/* Detalhe lateral da pena */}
        <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
};

export default Logo;
