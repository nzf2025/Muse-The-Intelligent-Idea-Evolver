
import React from 'react';

interface Props {
  onModeSelect: (mode: 'text' | 'voice' | 'photo') => void;
  isRecording?: boolean;
}

export const CaptureButtons: React.FC<Props> = ({ onModeSelect, isRecording }) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 glass-morphism rounded-full shadow-2xl z-50 border border-white/10">
      <button 
        onClick={() => onModeSelect('text')}
        className="p-4 bg-blue-600 hover:bg-blue-500 rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg group"
        title="文字火花"
      >
        <i className="fa-solid fa-pen-to-square text-xl text-white"></i>
      </button>

      <button 
        onClick={() => onModeSelect('voice')}
        className={`p-6 ${isRecording ? 'bg-red-500 animate-pulse scale-125' : 'bg-indigo-600 hover:bg-indigo-500'} rounded-full transition-all hover:scale-110 active:scale-95 shadow-xl`}
        title="语音记录"
      >
        <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-2xl text-white`}></i>
      </button>

      <button 
        onClick={() => onModeSelect('photo')}
        className="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg"
        title="拍照快照"
      >
        <i className="fa-solid fa-camera text-xl text-white"></i>
      </button>
    </div>
  );
};
