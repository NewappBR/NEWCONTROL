
import React from 'react';
import { Status } from '../types';
import { STATUS_COLORS } from '../constants';

interface StatusBadgeProps {
  status: Status;
  onClick?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 active:scale-95 ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </button>
  );
};

export default StatusBadge;
